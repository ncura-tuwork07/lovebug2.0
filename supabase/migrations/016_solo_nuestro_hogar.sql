-- Lovebug — migración 016: Lovebug es solo de Naza y Jaz.
-- Ya no se crean hogares nuevos ni se suma gente con un código de invitación. Se borran las
-- funciones que lo permitían: aunque alguien consiguiera crearse una cuenta, no podría armarse un
-- hogar ni meterse en el de ustedes (y sin hogar, la app le cierra la sesión).
-- No toca ningún dato: los hogares, integrantes y todo lo cargado quedan igual.

drop function if exists create_household(text, text, text);
drop function if exists create_household(text, text, text, text);
drop function if exists join_household(text, text, text);
drop function if exists join_household(text, text, text, text);
drop function if exists regenerate_invite_code();
