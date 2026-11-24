# Spécification de Sécurité Firestore — Assistant Shilo

## 1. Invariants de Données
1. Chaque profil utilisateur `/users/{userId}` est strictement privé au propriétaire authentifié et vérifié (`request.auth.uid == userId && request.auth.token.email_verified == true`).
2. Aucune liste globale de `/users` n'est autorisée (`allow list: if false;`), empêchant toute fuite de PII.
3. Une conversation `/users/{userId}/conversations/{conversationId}` appartient exclusivement à `userId` (`data.userId == userId == request.auth.uid`), avec vérification de l'existence du parent `/users/{userId}`.
4. Un message `/users/{userId}/conversations/{conversationId}/messages/{messageId}` ne peut exister sans une conversation parente valide appartenant au même `userId`.
5. Les horodatages `createdAt` et `updatedAt` doivent correspondre exactement à `request.time`. Les champs immuables (`uid`, `userId`, `id`, `conversationId`, `createdAt`) ne peuvent jamais être modifiés après création.
6. Les tableaux (`sources`) sont bornés à 15 éléments maximum.

## 2. Les 12 Payloads Malveillants ("Dirty Dozen")
1. **Usurpation d'identité sur profil**: Création de `/users/victim_uid` avec `uid: "attacker_uid"`. -> `PERMISSION_DENIED`.
2. **Champ fantôme (Shadow Update)**: Mise à jour du profil incluant `{ isAdmin: true }`. -> `PERMISSION_DENIED`.
3. **Email non vérifié**: Création d'une conversation avec `email_verified == false`. -> `PERMISSION_DENIED`.
4. **Lecture PII d'un autre utilisateur**: `get` sur `/users/other_uid`. -> `PERMISSION_DENIED`.
5. **Listage global des utilisateurs**: `list` sur `/users`. -> `PERMISSION_DENIED`.
6. **Injection d'ID malveillant**: Création avec `conversationId` de 1500 caractères ou contenant `$`. -> `PERMISSION_DENIED`.
7. **Falsification de timestamp**: Création avec `createdAt` antidaté dans le passé. -> `PERMISSION_DENIED`.
8. **Modification d'un champ immuable**: Update d'une conversation changeant `userId` ou `createdAt`. -> `PERMISSION_DENIED`.
9. **Message orphelin**: Création d'un message dans un `conversationId` inexistant. -> `PERMISSION_DENIED`.
10. **Déni de portefeuille (Payload géant)**: Message avec `content` de 100 000 caractères (`> 40000`). -> `PERMISSION_DENIED`.
11. **Tableau non borné**: Message avec `sources` contenant 50 entrées (`> 15`). -> `PERMISSION_DENIED`.
12. **Énumération invalide**: Profil avec `roleType: "superadmin"` hors liste autorisée. -> `PERMISSION_DENIED`.
