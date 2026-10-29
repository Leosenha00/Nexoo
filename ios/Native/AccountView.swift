import SwiftUI

struct AccountView: View {
    @ObservedObject var session: SessionStore
    @ObservedObject var call: CallController
    @State private var registering = false
    @State private var email = ""
    @State private var password = ""
    @State private var name = ""
    @State private var handle = ""
    @State private var query = ""
    var body: some View {
        Group {
            if let user = session.user {
                List {
                    Section { CallView(call: call) }
                    Section("Sua conta") { Text("\(user.name) · @\(user.handle)") }
                    Section("Buscar por @") {
                        TextField("@usuario", text: $query).textInputAutocapitalization(.never).autocorrectionDisabled()
                        Button("Buscar") { Task { await session.search(query) } }.disabled(session.busy)
                        ForEach(session.results) { person in
                            HStack {
                                Text("@\(person.handle)")
                                Spacer()
                                Button("Adicionar") { Task { await session.add(person) } }.disabled(session.busy)
                            }
                        }
                    }
                    Section("Amigos e solicitações") {
                        ForEach(session.relations) { relation in
                            VStack(alignment: .leading, spacing: 10) {
                                Text("@\(relation.user?.handle ?? "usuário")")
                                Text(relation.state == "accepted" ? "Amigo" : relation.state == "pending" ? "Solicitação pendente" : "Bloqueado").font(.caption)
                                HStack {
                                    if relation.state == "accepted", let friend = relation.user {
                                        Button("Voz") { call.start(toID: friend.id, video: false) }
                                        Button("Vídeo") { call.start(toID: friend.id, video: true) }
                                    }
                                    if relation.state == "pending" && relation.toId == user.id {
                                        Button("Aceitar") { Task { await session.relation(relation.id, method: "PATCH") } }
                                    }
                                    Button("Remover", role: .destructive) { Task { await session.relation(relation.id, method: "DELETE") } }
                                }.buttonStyle(.bordered).disabled(session.busy)
                            }
                        }
                        Button("Atualizar") { Task { await session.refresh() } }.disabled(session.busy)
                    }
                    Section { Button("Sair", role: .destructive) { Task { call.disconnect(); await session.logout() } }.disabled(session.busy) }
                    errorView
                }.refreshable { await session.refresh() }
                    .task(id: user.id) { call.connect(userID: user.id); await session.refresh() }
            } else {
                Form {
                    Section(registering ? "Criar conta Nexoo" : "Entrar no Nexoo") {
                        if registering {
                            TextField("Nome", text: $name).textContentType(.name)
                            TextField("@ exclusivo", text: $handle).textInputAutocapitalization(.never).autocorrectionDisabled()
                        }
                        TextField("E-mail", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled().accessibilityIdentifier("email")
                        SecureField("Senha", text: $password).textContentType(registering ? .newPassword : .password).accessibilityIdentifier("password")
                        if registering { Text("Use de 12 a 72 caracteres na senha. O servidor valida a exclusividade do @.").font(.caption) }
                        Button(registering ? "Cadastrar" : "Entrar") {
                            Task {
                                await session.authenticate(email: email, password: password, name: registering ? name : nil, handle: registering ? handle : nil)
                                password = ""
                            }
                        }.disabled(session.busy || email.isEmpty || password.isEmpty)
                        Button(registering ? "Já tenho conta" : "Criar conta") { registering.toggle() }
                    }
                    errorView
                }
            }
        }.navigationTitle("Conta Nexoo")
    }
    @ViewBuilder private var errorView: some View {
        if session.busy { ProgressView("Aguarde…") }
        if let error = session.error { Text(error).foregroundStyle(.red).accessibilityIdentifier("accountError") }
    }
}
