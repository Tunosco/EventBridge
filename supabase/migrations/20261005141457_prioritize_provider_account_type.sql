UPDATE public.utilisateur u
SET type_utilisateur = 'prestataire'
WHERE u.type_utilisateur <> 'prestataire'
  AND EXISTS (
    SELECT 1
    FROM public.prestataire p
    WHERE p.utilisateur_id = u.id
  );