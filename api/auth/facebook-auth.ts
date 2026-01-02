import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { prisma } from '../../server/context.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

passport.use(
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_APP_ID!,
			clientSecret: process.env.FACEBOOK_APP_SECRET!,
			callbackURL: process.env.FACEBOOK_CALLBACK_URL!,
			profileFields: ['id', 'displayName', 'photos', 'email'],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				let user = await prisma.user.findFirst({
					where: { facebookId: profile.id },
				});

				if (!user) {
					user = await prisma.user.create({
						data: {
							facebookId: profile.id,
							email: profile.emails?.[0]?.value,
							name: profile.displayName,
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
			'facebook',
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
		passport.authenticate('facebook', {
			scope: ['email'],
			session: false,
		})(req, res);
	}
}
