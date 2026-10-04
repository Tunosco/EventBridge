ALTER TABLE public.utilisateur
	ADD COLUMN IF NOT EXISTS type_utilisateur TEXT NOT NULL DEFAULT 'client';

UPDATE public.utilisateur u
SET type_utilisateur = CASE
	WHEN EXISTS (SELECT 1 FROM public.client c WHERE c.utilisateur_id = u.id) THEN 'client'
	WHEN EXISTS (SELECT 1 FROM public.prestataire p WHERE p.utilisateur_id = u.id) THEN 'prestataire'
	ELSE 'client'
END;

ALTER TABLE public.utilisateur
	ADD CONSTRAINT utilisateur_type_utilisateur_check
	CHECK (type_utilisateur IN ('client', 'prestataire'));