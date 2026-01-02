import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../context';

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			callbackURL:
				process.env.GOOGLE_CALLBACK_URL ||
				'http://localhost:4000/auth/google/callback',
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				let user = await prisma.user.findFirst({
					where: { googleId: profile.id },
				});

				if (!user) {
					user = await prisma.user.create({
						data: {
							googleId: profile.id,
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

passport.use(
	new GitHubStrategy(
		{
			clientID: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			callbackURL:
				process.env.GITHUB_CALLBACK_URL ||
				'http://localhost:4000/auth/github/callback',
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

passport.use(
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_APP_ID!,
			clientSecret: process.env.FACEBOOK_APP_SECRET!,
			callbackURL:
				process.env.FACEBOOK_CALLBACK_URL ||
				'http://localhost:4000/auth/facebook/callback',
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

passport.serializeUser((user: any, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
	try {
		const user = await prisma.user.findUnique({
			where: { id },
		});
		done(null, user);
	} catch (error) {
		done(error);
	}
});
