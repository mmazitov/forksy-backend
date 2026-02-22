import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Context } from '../context.js';
import { JWT_SECRET, requireAuth } from './utils.js';

export const userResolvers = {
	User: {
		favoriteProducts: async (parent: any, _args: unknown, context: Context) => {
			return await context.prisma.user.findUnique({
				where: { id: parent.id },
				select: { favoriteProducts: true }
			}).then(user => user?.favoriteProducts || []);
		},
		favoriteDishes: async (parent: any, _args: unknown, context: Context) => {
			return await context.prisma.user.findUnique({
				where: { id: parent.id },
				select: { favoriteDishes: true }
			}).then(user => user?.favoriteDishes || []);
		},
		dishesCount: (parent: any) => parent._count?.dishes ?? 0,
		productsCount: (parent: any) => parent._count?.products ?? 0,
	},
	Query: {
		me: async (_parent: unknown, _args: unknown, context: Context) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.findUnique({
				where: { id: userId },
				include: { _count: { select: { dishes: true, products: true } } },
			});

			return user;
		},
		favoriteProducts: async (
			_parent: unknown,
			_args: unknown,
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.findUnique({
				where: { id: userId },
				include: {
					favoriteProducts: true,
				},
			});

			return user?.favoriteProducts || [];
		},
		favoriteDishes: async (
			_parent: unknown,
			_args: unknown,
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.findUnique({
				where: { id: userId },
				include: {
					favoriteDishes: true,
				},
			});

			return user?.favoriteDishes || [];
		},
	},
	Mutation: {
		register: async (
			_parent: unknown,
			args: { email: string; password: string; name?: string },
			context: Context,
		) => {
			const hashedPassword = await bcrypt.hash(args.password, 10);

			const user = await context.prisma.user.create({
				data: {
					email: args.email,
					password: hashedPassword,
					name: args.name,
				},
			});

			const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
				expiresIn: '15m',
			});

			const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
			const refreshToken = jwt.sign({ userId: user.id }, refreshTokenSecret, {
				expiresIn: '30d',
			});

			context.res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
			});

			return { token, user };
		},
		login: async (
			_parent: unknown,
			args: { email: string; password: string; rememberMe?: boolean },
			context: Context,
		) => {
			const user = await context.prisma.user.findUnique({
				where: { email: args.email },
			});

			if (!user) {
				throw new Error('Invalid credentials');
			}

			const valid = await bcrypt.compare(args.password, user.password!);
			if (!valid) {
				throw new Error('Invalid credentials');
			}

			const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
				expiresIn: '15m',
			});

			const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
			const refreshToken = jwt.sign({ userId: user.id }, refreshTokenSecret, {
				expiresIn: args.rememberMe ? '30d' : '1d',
			});

			// If rememberMe = false, it can be a session cookie, but for safety providing a maxAge of 1 day is okay too.
			context.res.cookie('refreshToken', refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				maxAge: args.rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined,
			});

			return { token, user };
		},
		refreshToken: async (
			_parent: unknown,
			_args: unknown,
			context: Context,
		) => {
			const tokenContext = context.req.cookies?.refreshToken;

			if (!tokenContext) {
				throw new Error('No refresh token found');
			}

			try {
				const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
				const decoded = jwt.verify(tokenContext, refreshTokenSecret) as { userId: string };

				const user = await context.prisma.user.findUnique({
					where: { id: decoded.userId },
				});

				if (!user) {
					throw new Error('User not found');
				}

				const newAccessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
					expiresIn: '15m',
				});

				// Optionally rotate refresh token here if desired
				// const newRefreshToken = jwt.sign({ userId: user.id }, refreshTokenSecret, { expiresIn: '30d' });
				// context.res.cookie('refreshToken', newRefreshToken, { ... });

				return { token: newAccessToken, user };
			} catch (e) {
				// Clear the invalid cookie
				context.res.clearCookie('refreshToken');
				throw new Error('Invalid refresh token');
			}
		},
		updateProfile: async (
			_parent: unknown,
			args: {
				name?: string;
				phone?: string;
				avatar?: string;
				diet?: string;
				allergy?: string[];
				dislike?: string[];
			},
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.update({
				where: { id: userId },
				data: {
					...(args.name !== undefined && { name: args.name }),
					...(args.phone !== undefined && { phone: args.phone }),
					...(args.avatar !== undefined && { avatar: args.avatar }),
					...(args.diet !== undefined && { diet: args.diet }),
					...(args.allergy !== undefined && { allergy: args.allergy }),
					...(args.dislike !== undefined && { dislike: args.dislike }),
				},
			});

			return user;
		},
		changePassword: async (
			_parent: unknown,
			args: { currentPassword: string; newPassword: string },
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.findUnique({
				where: { id: userId },
			});

			if (!user?.password) {
				throw new Error('Password change is not available for OAuth accounts');
			}

			const isValid = await bcrypt.compare(args.currentPassword, user.password);
			if (!isValid) {
				throw new Error('Current password is incorrect');
			}

			const hashedPassword = await bcrypt.hash(args.newPassword, 10);
			await context.prisma.user.update({
				where: { id: userId },
				data: { password: hashedPassword },
			});

			return true;
		},
		addToFavoritesProduct: async (
			_parent: unknown,
			args: { productId: string },
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.update({
				where: { id: userId },
				data: {
					favoriteProducts: {
						connect: { id: args.productId },
					},
				},
			});

			return user;
		},
		removeFromFavoritesProduct: async (
			_parent: unknown,
			args: { productId: string },
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.update({
				where: { id: userId },
				data: {
					favoriteProducts: {
						disconnect: { id: args.productId },
					},
				},
			});

			return user;
		},
		addToFavoritesDish: async (
			_parent: unknown,
			args: { dishId: string },
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.update({
				where: { id: userId },
				data: {
					favoriteDishes: {
						connect: { id: args.dishId },
					},
				},
			});

			return user;
		},
		removeFromFavoritesDish: async (
			_parent: unknown,
			args: { dishId: string },
			context: Context,
		) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.update({
				where: { id: userId },
				data: {
					favoriteDishes: {
						disconnect: { id: args.dishId },
					},
				},
			});

			return user;
		},
		handleOAuthCallback: async (
			_parent: unknown,
			args: { provider: string; code: string },
			context: Context,
		) => {
			return new Promise((resolve, reject) => {
				// Create a mock request object with the code parameter
				const req = {
					query: { code: args.code },
					user: null,
				} as any;

				const res = {} as any;
				const next = () => {};

				passport.authenticate(
					args.provider,
					{ session: false },
					(err: any, user: any) => {
						if (err || !user) {
							console.error(`[OAuth] ${args.provider} authentication failed:`, err);
							reject(new Error('Authentication failed'));
							return;
						}

						const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
							expiresIn: '7d',
						});

						resolve({ token, user });
					},
				)(req, res, next);
			});
		},
	},
};