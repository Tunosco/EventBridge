DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.utilisateur
		WHERE telephone IS NOT NULL
		GROUP BY telephone
		HAVING COUNT(*) > 1
	) THEN
		RAISE EXCEPTION 'Impossible de rendre utilisateur.telephone unique : des numéros en double existent.';
	END IF;
END;
$$;

UPDATE public.utilisateur
SET prenom = 'Utilisateur'
WHERE prenom IS NULL OR btrim(prenom) = '';

ALTER TABLE public.utilisateur
	ALTER COLUMN prenom SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS utilisateur_telephone_unique
	ON public.utilisateur (telephone);

ALTER TABLE public.utilisateur ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.type_evenement ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.evenement ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.emplacement_evenement ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.zone_intervention ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.disponibilite ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.categorie_prestation ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.prestation ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.option_prestation ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.media_prestation ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.prestataire_tache ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.conversation ALTER COLUMN id SET GENERATED ALWAYS;
ALTER TABLE public.message ALTER COLUMN id SET GENERATED ALWAYS;