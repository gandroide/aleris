// supabase/functions/invite-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejo de CORS (para que tu frontend pueda llamar a esta función)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Crear cliente de Supabase con permisos de ADMIN (Service Role)
    // Estas variables se inyectan automáticamente en la Edge Function
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 2. Obtener datos del cuerpo de la petición (lo que envía tu frontend)
    const { email, role, orgId } = await req.json();

    if (!email || !orgId) {
      throw new Error("Email y Organization ID son obligatorios");
    }

    // 3. Invitar al usuario
    // Esto enviará automáticamente el correo de Supabase al usuario
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          // Estos datos se guardarán en la metadata del usuario
          // Útil para que un Trigger luego lo asigne a la tabla de profiles/organization
          organization_id: orgId,
          role: role || "staff",
          full_name: email.split("@")[0], // Un nombre temporal
        },
        // Opcional: Redirigir al usuario a una página específica tras aceptar
        redirectTo: "https://tu-app.com/update-password",
      },
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "Invitación enviada", user: data.user }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
