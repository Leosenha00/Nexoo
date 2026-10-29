# Arquivos da continuação iOS

Comparação com `fec3db1`, ponto de partida desta continuação. O web/backend não tiveram arquivos de implementação alterados. O manifesto/lock web foram corrigidos para build verificável.

Status Git: A criado, M modificado, R renomeado.

```text
M	.env.example
R054	.github/workflows/ios-unsigned.yml	.github/workflows/ios-build.yml
A	.github/workflows/ios-ipa.yml
M	.gitignore
M	IOS_NATIVE_PLAN.md
M	README.md
M	TEST_RESULTS.md
M	docs/IOS_NATIVE_AUDIT.md
A	ios/Assets.xcassets/AppIcon.appiconset/AppIcon.png
A	ios/Assets.xcassets/AppIcon.appiconset/Contents.json
A	ios/Assets.xcassets/Contents.json
M	ios/BroadcastExtension/SampleHandler.swift
A	ios/Entitlements/App.entitlements
A	ios/Entitlements/AppGroups.entitlements
A	ios/Entitlements/Broadcast.entitlements
A	ios/Native/APIClient.swift
A	ios/Native/AccountView.swift
A	ios/Native/CallController.swift
A	ios/Native/CallView.swift
A	ios/Native/SessionStore.swift
A	ios/Native/VideoQualityPolicy.swift
M	ios/NexooApp.swift
M	ios/README.md
A	ios/Tests/APIClientTests.swift
A	ios/Tests/SessionStoreTests.swift
A	ios/Tests/VideoQualityPolicyTests.swift
M	ios/UITests/NexooLaunchTests.swift
M	ios/VALIDATION.md
A	ios/project-with-app-groups.yml
M	ios/project.yml
A	ios/scripts/diagnose.py
A	ios/scripts/prepare_signing.sh
A	ios/scripts/test_validate_profiles.py
A	ios/scripts/validate_profiles.py
A	ios/scripts/verify_ipa.sh
M	package-lock.json
M	package.json
A	docs/IOS_DELIVERY_FILES.md
A	docs/IOS_INSTALLATION.md
```

Os `.xcodeproj` e `Info.plist` gerados são guardados nos artefatos do CI; `ios/project.yml` é a fonte reproduzível. Nenhum certificado, provisioning profile, arquivo de pareamento ou credencial Apple foi adicionado.
