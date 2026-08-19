export function appUrl(request: Request) {
	const configuredUrl = process.env.APP_URL;
	if (configuredUrl) return new URL("/", configuredUrl);
	return new URL("/", request.url);
}
