import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Context } from '../context.js';
import { JWT_SECRET, requireAuth } from './utils.js';

export const userResolvers = {
	Query: {
		me: async (_parent: unknown, _args: unknown, context: Context) => {
			const userId = requireAuth(context);

			const user = await context.prisma.user.findUnique({
				where: { id: userId },
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
				expiresIn: '30d',
			});

			return { token, user };
		},
		login: async (
			_parent: unknown,
			args: { email: string; password: string },
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
				expiresIn: '30d',
			});

			return { token, user };
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