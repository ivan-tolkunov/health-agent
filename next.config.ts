import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: [
		"@electric-sql/pglite",
		"@earendil-works/pi-coding-agent",
	],
};

export default nextConfig;
