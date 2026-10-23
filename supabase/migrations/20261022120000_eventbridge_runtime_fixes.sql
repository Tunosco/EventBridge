-- EventBridge — alignement du schéma PostgreSQL avec le code de l'API.
-- Ajoute les éléments utilisés par le serveur qui manquaient à la migration
-- initiale : participants de conversation, clé publique, sessions, et
-- corrections de noms de colonnes (camelCase) dans les réponses JSON.

-- 1. Colonne de clé publique (chiffrement de la messagerie).
ALTER TABLE public.utilisateur
  ADD COLUMN IF NOT EXISTS public_key TEXT;

-- 2. Table des participants de conversation (remplace client_id/prestataire_id).
CREATE TABLE IF NOT EXISTS public.conversation_participant (
  conversation_id INTEGER NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
  utilisateur_id INTEGER NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
  date_jointure TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, utilisateur_id)
);

CREATE INDEX IF NOT EXISTS conversation_participant_utilisateur_idx
  ON public.conversation_participant (utilisateur_id);

INSERT INTO public.conversation_participant (conversation_id, utilisateur_id)
  SELECT id, client_id FROM public.conversation
  ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_participant (conversation_id, utilisateur_id)
  SELECT id, prestataire_id FROM public.conversation
  ON CONFLICT DO NOTHING;

ALTER TABLE public.conversation_participant ENABLE ROW LEVEL SECURITY;

-- 3. Sessions persistées (l'API conserve ainsi les connexions après un redémarrage).
CREATE TABLE IF NOT EXISTS public.session (
  token TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES public.utilisateur(id) ON DELETE CASCADE,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_expiration TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS session_utilisateur_idx ON public.session (utilisateur_id);

ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;

-- 4. Prix minimum exposé par le catalogue des prestataires.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prestation' AND column_name = 'prix'
  ) THEN
    ALTER TABLE public.prestation ADD COLUMN prix DOUBLE PRECISION;
  END IF;
END;
$$;
