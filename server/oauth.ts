import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const handleOAuthCallback =
	(provider: string) => (req: any, res: any, next: any) => {
		passport.authenticate(
			provider,
			{ session: false },
			(err: any, user: any) => {
				if (err || !user) {
					console.error(`[OAuth] ${provider} authentication failed:`, err);
					return res.status(401).json({ error: 'Authentication failed' });
				}

				const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
					expiresIn: '7d',
				});

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
		)(req, res, next);
	};

router.get('/google-auth', (req, res, next) => {
	if (req.query.code) {
		handleOAuthCallback('google')(req, res, next);
	} else {
		passport.authenticate('google', { scope: ['profile', 'email'] })(
			req,
			res,
			next,
		);
	}
});

router.get('/google/callback', handleOAuthCallback('google'));

router.get('/github-auth', (req, res, next) => {
	if (req.query.code) {
		handleOAuthCallback('github')(req, res, next);
	} else {
		passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
	}
});

router.get('/github/callback', handleOAuthCallback('github'));

router.get('/facebook-auth', (req, res, next) => {
	if (req.query.code) {
		handleOAuthCallback('facebook')(req, res, next);
	} else {
		passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
	}
});

router.get('/facebook/callback', handleOAuthCallback('facebook'));

export default router;
