#!/usr/bin/env bash
# Bloque les écritures directes des outils Edit, Write et apply_patch sur les données sensibles.
set -u
source "$(dirname "$0")/lib.sh"
read_payload
root=$(project_root)

deny() {
  jq -n --arg reason "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

while IFS= read -r rel; do
  case "$rel" in
    @outside:*) deny "Écriture hors du projet détectée ($rel). Vérifier le projet cible." ;;
    .env|.env.*)
      case "$rel" in .env.example|.env.*.example) ;; *) deny "Fichier de configuration sensible ($rel). Utiliser un fichier .example sans secret." ;; esac ;;
    backups/*|mysql_data/*|*.sqlite|*.sqlite3|*.sql|*.sql.gz)
      deny "Fichier de données ou sauvegarde protégé ($rel)." ;;
  esac
done < <(target_files "$root")
exit 0
