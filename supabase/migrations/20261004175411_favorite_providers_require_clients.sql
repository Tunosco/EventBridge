ALTER TABLE public.favori_prestataire
	DROP CONSTRAINT IF EXISTS favori_prestataire_utilisateur_id_fkey;

ALTER TABLE public.favori_prestataire
	RENAME COLUMN utilisateur_id TO client_id;

DELETE FROM public.favori_prestataire f
WHERE NOT EXISTS (
	SELECT 1
	FROM public.client c
	WHERE c.utilisateur_id = f.client_id
);

ALTER TABLE public.favori_prestataire
	ADD CONSTRAINT favori_prestataire_client_id_fkey
	FOREIGN KEY (client_id) REFERENCES public.client(utilisateur_id) ON DELETE CASCADE;