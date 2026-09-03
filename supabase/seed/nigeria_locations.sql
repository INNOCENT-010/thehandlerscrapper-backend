-- National selector seed: all 36 Nigerian states + FCT.
-- Cities/LGAs/areas are deliberately modeled as child rows so you can import the full 774-LGA dataset without changing application code.
insert into public.locations(name,slug,type,country_code) values
('Nigeria','nigeria','country','NG') on conflict do nothing;

insert into public.locations(parent_id,name,slug,type,country_code)
select c.id,v.name,v.slug,'state','NG'::text
from public.locations c cross join (values
('Abia','abia'),('Adamawa','adamawa'),('Akwa Ibom','akwa-ibom'),('Anambra','anambra'),('Bauchi','bauchi'),('Bayelsa','bayelsa'),('Benue','benue'),('Borno','borno'),('Cross River','cross-river'),('Delta','delta'),('Ebonyi','ebonyi'),('Edo','edo'),('Ekiti','ekiti'),('Enugu','enugu'),('Gombe','gombe'),('Imo','imo'),('Jigawa','jigawa'),('Kaduna','kaduna'),('Kano','kano'),('Katsina','katsina'),('Kebbi','kebbi'),('Kogi','kogi'),('Kwara','kwara'),('Lagos','lagos'),('Nasarawa','nasarawa'),('Niger','niger'),('Ogun','ogun'),('Ondo','ondo'),('Osun','osun'),('Oyo','oyo'),('Plateau','plateau'),('Rivers','rivers'),('Sokoto','sokoto'),('Taraba','taraba'),('Yobe','yobe'),('Zamfara','zamfara'),('Federal Capital Territory','fct')) v(name,slug) where c.type='country' and c.slug='nigeria' on conflict do nothing;

-- Add cities/LGAs/areas with the same shape. Example:
-- insert into public.locations(parent_id,name,slug,type)
-- select id,'Lekki','lekki','city' from public.locations where slug='lagos' and type='state';
