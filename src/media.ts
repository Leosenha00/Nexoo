import type { Socket } from "socket.io-client";
import { api } from "./api";
import { qualities } from "./quality";
import type { Quality } from "./quality";
export class MediaCall {
  pc!: RTCPeerConnection;
  local = new MediaStream();
  remoteCamera = new MediaStream();
  remoteScreen = new MediaStream();
  remoteAudio = new MediaStream();
  display?: MediaStream;
  screenSender?: RTCRtpSender;
  screenAudio?: RTCRtpSender;
  cameraSender?: RTCRtpSender;
  pending: RTCIceCandidateInit[] = [];
  making = false;
  ignore = false;
  polite = false;
  closed = false;
  accepted = false;
  quality: Quality = "1080p · 30 FPS";
  mode = "auto";
  timer?: ReturnType<typeof setInterval>;
  prev?: { bytes: number; time: number; lost: number; received: number };
  volume = 1;
  constructor(
    public socket: Socket,
    public id: string,
    public update: () => void,
    public report: (s: any) => void,
    public error: (s: string) => void,
  ) {}
  send(p: object) {
    this.socket.emit("signal", { id: this.id, ...p }, (r: any) => {
      if (!r?.ok && !this.closed)
        this.error(r?.error || "Falha na sinalização");
    });
  }
  async init(video: boolean, polite: boolean, mic = "", camera = "") {
    this.polite = polite;
    const config = await api("/ice");
    this.pc = new RTCPeerConnection(config);
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(mic ? { deviceId: { exact: mic } } : {}),
        },
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              ...(camera ? { deviceId: { exact: camera } } : {}),
            }
          : false,
      });
    } catch (e) {
      this.pc.close();
      throw e;
    }
    // Fixed transceiver order makes camera, screen and screen audio independently addressable.
    this.pc.addTransceiver(this.local.getAudioTracks()[0], {
      direction: "sendrecv",
      streams: [this.local],
    });
    this.cameraSender = this.pc.addTransceiver(
      this.local.getVideoTracks()[0] || "video",
      { direction: "sendrecv", streams: [this.local] },
    ).sender;
    this.screenSender = this.pc.addTransceiver("video", {
      direction: "sendrecv",
    }).sender;
    this.screenAudio = this.pc.addTransceiver("audio", {
      direction: "sendrecv",
    }).sender;
    for (const t of this.pc.getTransceivers()) {
      const kind = t.receiver.track.kind;
      const caps = RTCRtpReceiver.getCapabilities(kind);
      if (caps && t.setCodecPreferences) {
        const order =
          kind === "video"
            ? ["video/VP9", "video/AV1", "video/VP8", "video/H264"]
            : ["audio/opus"];
        t.setCodecPreferences(
          [...caps.codecs].sort((a, b) => {
            const rank = (m: string) => {
              const n = order.indexOf(m);
              return n < 0 ? 99 : n;
            };
            return rank(a.mimeType) - rank(b.mimeType);
          }),
        );
      }
    }
    this.pc.ontrack = (e) => {
      const index = this.pc.getTransceivers().indexOf(e.transceiver);
      const stream =
        index === 1
          ? this.remoteCamera
          : index === 2
            ? this.remoteScreen
            : this.remoteAudio;
      stream.addTrack(e.track);
      e.track.onunmute = () => this.update();
      this.update();
    };
    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ candidate: e.candidate.toJSON() });
    };
    this.pc.onnegotiationneeded = () => {
      if (this.accepted) void this.offer();
    };
    this.pc.onconnectionstatechange = () => {
      this.report({ connection: this.pc.connectionState });
      if (this.pc.connectionState === "failed") this.restart();
    };
    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === "disconnected")
        setTimeout(() => {
          if (!this.closed && this.pc.iceConnectionState === "disconnected")
            this.restart();
        }, 3000);
    };
    this.timer = setInterval(() => void this.stats(), 2000);
    this.update();
  }
  async offer() {
    if (this.closed || this.making || this.pc.signalingState !== "stable")
      return;
    try {
      this.making = true;
      await this.pc.setLocalDescription();
      this.send({ description: this.pc.localDescription });
    } catch (e) {
      this.error(String(e));
    } finally {
      this.making = false;
    }
  }
  async signal(p: any) {
    if (this.closed) return;
    try {
      if (p.screen !== undefined) this.report({ remoteSharing: p.screen });
      if (p.description) {
        const collision =
          p.description.type === "offer" &&
          (this.making || this.pc.signalingState !== "stable");
        this.ignore = !this.polite && collision;
        if (this.ignore) return;
        await this.pc.setRemoteDescription(p.description);
        for (const c of this.pending) await this.pc.addIceCandidate(c);
        this.pending = [];
        if (p.description.type === "offer") {
          this.accepted = true;
          await this.pc.setLocalDescription();
          this.send({ description: this.pc.localDescription });
        }
      } else if (p.candidate) {
        if (this.ignore) return;
        if (this.pc.remoteDescription)
          await this.pc.addIceCandidate(p.candidate);
        else this.pending.push(p.candidate);
      }
    } catch (e) {
      this.error("Falha ao negociar a conexão: " + String(e));
    }
  }
  restart() {
    if (this.closed) return;
    this.pc.restartIce();
    if (!this.polite) void this.offer();
  }
  async toggleCamera(device = "") {
    const old = this.cameraSender?.track;
    if (old) {
      old.enabled = !old.enabled;
      this.update();
      return;
    }
    const s = await navigator.mediaDevices.getUserMedia({
      video: device ? { deviceId: { exact: device } } : true,
    });
    const t = s.getVideoTracks()[0];
    if (this.closed) {
      t.stop();
      return;
    }
    this.local.addTrack(t);
    await this.cameraSender!.replaceTrack(t);
    this.update();
  }
  async changeMic(device: string) {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: device ? { exact: device } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const t = s.getAudioTracks()[0];
    if (this.closed) {
      t.stop();
      return;
    }
    const sender = this.pc
      .getSenders()
      .find((x) => x.track?.kind === "audio" && x !== this.screenAudio);
    const old = sender?.track;
    t.enabled = old?.enabled ?? true;
    await sender?.replaceTrack(t);
    if (old) {
      old.stop();
      this.local.removeTrack(old);
    }
    this.local.addTrack(t);
    this.update();
  }
  async share(q: Quality, mode: string) {
    if (!navigator.mediaDevices?.getDisplayMedia)
      throw Error(
        "Este navegador não permite compartilhar a tela. Você ainda pode assistir.",
      );
    const [width, height, frameRate] = qualities[q];
    const s = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: width, max: width },
        height: { ideal: height, max: height },
        frameRate: { ideal: frameRate, max: frameRate },
        cursor: "always",
        displaySurface: "monitor",
      } as any,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      systemAudio: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
    } as any);
    if (this.closed) {
      s.getTracks().forEach((t) => t.stop());
      return;
    }
    this.quality = q;
    this.mode = mode;
    this.display = s;
    const track = s.getVideoTracks()[0];
    track.contentHint = mode === "motion" ? "motion" : "detail";
    track.onended = () => void this.stopShare();
    await this.screenSender!.replaceTrack(track);
    await this.screenAudio!.replaceTrack(s.getAudioTracks()[0] || null);
    await this.adapt(1);
    this.send({ screen: true });
    this.update();
  }
  async stopShare() {
    const s = this.display;
    this.display = undefined;
    s?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    if (!this.closed) {
      await this.screenSender?.replaceTrack(null);
      await this.screenAudio?.replaceTrack(null);
      this.send({ screen: false });
      this.update();
    }
  }
  async adapt(scale: number) {
    if (!this.screenSender?.track) return;
    const p = this.screenSender.getParameters();
    if (!p.encodings.length) p.encodings = [{}];
    const targetBitrate = qualities[this.quality][3];
    p.encodings[0].maxBitrate = targetBitrate / scale;
    p.encodings[0].scaleResolutionDownBy = scale;
    p.encodings[0].maxFramerate = scale > 1 ? 30 : qualities[this.quality][2];
    (p.encodings[0] as any).priority = "high";
    (p.encodings[0] as any).networkPriority = "high";
    p.degradationPreference =
      this.mode === "motion" ? "maintain-framerate" : "maintain-resolution";
    try {
      await this.screenSender.setParameters(p);
    } catch {
      /* Browser may not support a parameter; negotiated defaults remain. */
    }
  }
  async stats() {
    if (this.closed) return;
    try {
      const stats = await this.pc.getStats();
      let rtt = 0,
        jitter = 0,
        lost = 0,
        received = 0,
        bytes = 0,
        speaking = false,
        remoteSpeaking = false;
      stats.forEach((s) => {
        if (s.type === "candidate-pair" && s.state === "succeeded")
          rtt = s.currentRoundTripTime || 0;
        if (s.type === "inbound-rtp") {
          jitter = Math.max(jitter, s.jitter || 0);
          lost += s.packetsLost || 0;
          received += s.packetsReceived || 0;
          remoteSpeaking ||= (s.audioLevel || 0) > 0.02;
        }
        if (s.type === "remote-inbound-rtp")
          rtt = Math.max(rtt, s.roundTripTime || 0);
        if (s.type === "outbound-rtp") bytes += s.bytesSent || 0;
        if (s.type === "media-source") speaking ||= (s.audioLevel || 0) > 0.02;
      });
      const now = Date.now();
      const delta = this.prev ? Math.max(0, lost - this.prev.lost) : 0;
      const packets = this.prev
        ? Math.max(0, received - this.prev.received) + delta
        : 0;
      const loss = packets ? delta / packets : 0;
      const bitrate = this.prev
        ? ((bytes - this.prev.bytes) * 8) / (now - this.prev.time)
        : 0;
      this.prev = { bytes, time: now, lost, received };
      this.report({
        rtt: Math.round(rtt * 1000),
        jitter: Math.round(jitter * 1000),
        loss: Math.round(loss * 100),
        bitrate: Math.round(bitrate),
        speaking,
        remoteSpeaking,
      });
      const shouldScale =
        this.mode === "motion"
          ? (loss > 0.1 || rtt > 0.4 ? 1.5 : 1)
          : (loss > 0.2 ? 1.25 : 1);
      await this.adapt(shouldScale);
    } catch {}
  }
  close() {
    this.closed = true;
    clearInterval(this.timer);
    this.local.getTracks().forEach((t) => t.stop());
    this.display?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.remoteAudio.getTracks().forEach((t) => t.stop());
    this.remoteCamera.getTracks().forEach((t) => t.stop());
    this.remoteScreen.getTracks().forEach((t) => t.stop());
  }
}
