import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from '../../server/context.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

passport.use(
	new GitHubStrategy(
		{
			clientID: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			callbackURL: process.env.GITHUB_CALLBACK_URL!,
		},
		async (
			accessToken: string,
			refreshToken: string,
			profile: any,
			done: any,
		) => {
			try {
				let user = await prisma.user.findFirst({
					where: { githubId: profile.id.toString() },
				});

				if (!user) {
					user = await prisma.user.create({
						data: {
							githubId: profile.id.toString(),
							email: profile.emails?.[0]?.value,
							name: profile.displayName || profile.username,
							...(profile.photos?.[0]?.value && {
								avatar: profile.photos[0].value,
							}),
						},
					});
				}

				return done(null, user);
			} catch (error) {
				return done(error);
			}
		},
	),
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.query.code) {
		passport.authenticate(
			'github',
			{ session: false },
			(err: any, user: any) => {
				if (err || !user) {
					return res.status(401).json({ error: 'Authentication failed' });
				}

				const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
					expiresIn: '7d',
				});

				res.setHeader('Content-Type', 'text/html');
				res.send(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Authentication Success</title>
				</head>
				<body>
					<h3>Authentication successful! Closing window...</h3>
					<script>
						if (window.opener) {
							window.opener.postMessage(
								{ type: 'OAUTH_SUCCESS', token: '${token}' },
								'*'
							);
							setTimeout(() => window.close(), 500);
						}
					</script>
				</body>
				</html>
			`);
			},
		)(req, res);
	} else {
		passport.authenticate('github', {
			scope: ['user:email'],
			session: false,
		})(req, res);
	}
}
