CREATE TABLE services (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX services_name_unique ON services (lower(name));
INSERT INTO services (name) VALUES
 ('Accueil / État civil'),('Administration générale'),('Communication'),
 ('Culture'),('Bibliothèque'),('Services techniques'),('Urbanisme'),
 ('Enfance / Jeunesse'),('Sports'),('Police municipale'),
 ('CCAS / Action sociale'),('Finances'),('Ressources humaines')
 ON CONFLICT (lower(name)) DO NOTHING;
-- Preserve service names already used by agents, ignoring case and repeated spaces.
INSERT INTO services (name)
 SELECT DISTINCT regexp_replace(btrim(service), '\s+', ' ', 'g')
 FROM requests WHERE char_length(regexp_replace(btrim(service), '\s+', ' ', 'g')) BETWEEN 2 AND 100
 ON CONFLICT (lower(name)) DO NOTHING;
CREATE INDEX requests_service_idx ON requests (lower(service));
