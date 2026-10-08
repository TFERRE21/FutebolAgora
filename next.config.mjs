/** @type {import('next').NextConfig} */
const nextConfig = {
  // O painel roda em Next.js dev dentro do InContainer; liberar o domínio
  // público evita que o HMR seja bloqueado pelo proxy reverso.
  allowedDevOrigins: ["futebolagora.vps11710.panel.icontainer.work"]
};

export default nextConfig;
