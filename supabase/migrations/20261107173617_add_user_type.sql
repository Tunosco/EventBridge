ALTER TABLE public.utilisateur
  ADD COLUMN IF NOT EXISTS type_utilisateur TEXT NOT NULL DEFAULT 'client';

ALTER TABLE public.utilisateur
  DROP CONSTRAINT IF EXISTS utilisateur_type_utilisateur_check;

ALTER TABLE public.utilisateur
  ADD CONSTRAINT utilisateur_type_utilisateur_check
  CHECK (type_utilisateur IN ('client', 'prestataire'));

UPDATE public.utilisateur AS u
SET type_utilisateur = 'prestataire'
WHERE EXISTS (
  SELECT 1
  FROM public.prestataire AS p
  WHERE p.utilisateur_id = u.id
);