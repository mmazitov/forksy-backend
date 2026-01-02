import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Context } from './context.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const resolvers = {
	Query: {
		me: async (_parent: unknown, _args: unknown, context: Context) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const user = await context.prisma.user.findUnique({
				where: { id: context.userId },
			});

			return user;
		},
		product: async (
			_parent: unknown,
			args: { id: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const product = await context.prisma.product.findUnique({
				where: { id: args.id },
			});

			return product;
		},
		products: async (
			_parent: unknown,
			args: {
				category?: string;
				search?: string;
				limit?: number;
				offset?: number;
			},
			context: Context,
		) => {
			const products = await context.prisma.product.findMany({
				where: {
					...(args.category && { category: args.category }),
					...(args.search && {
						name: { contains: args.search, mode: 'insensitive' },
					}),
				},
				take: args.limit,
				skip: args.offset || 0,
				orderBy: { createdAt: 'desc' },
			});

			return products;
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

			const token = jwt.sign({ userId: user.id }, JWT_SECRET);

			return {
				token,
				user,
			};
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
				throw new Error('Invalid email or password');
			}

			const valid = await bcrypt.compare(args.password, user.password || '');
			if (!valid) {
				throw new Error('Invalid email or password');
			}

			const token = jwt.sign({ userId: user.id }, JWT_SECRET);

			return {
				token,
				user,
			};
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
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const updatedUser = await context.prisma.user.update({
				where: { id: context.userId },
				data: {
					...(args.name !== undefined && { name: args.name }),
					...(args.phone !== undefined && { phone: args.phone }),
					...(args.avatar !== undefined && { avatar: args.avatar }),
					...(args.diet !== undefined && { diet: args.diet }),
					...(args.allergy !== undefined && { allergy: args.allergy }),
					...(args.dislike !== undefined && { dislike: args.dislike }),
				},
			});

			return updatedUser;
		},
		createProduct: async (
			_parent: unknown,
			args: {
				name: string;
				category?: string;
				imageUrl?: string;
				calories?: number;
				fat?: number;
				carbs?: number;
				protein?: number;
				description?: string;
			},
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const product = await context.prisma.product.create({
				data: {
					name: args.name,
					category: args.category,
					imageUrl: args.imageUrl,
					calories: args.calories,
					fat: args.fat,
					carbs: args.carbs,
					protein: args.protein,
					description: args.description,
					userId: context.userId,
				},
			});

			return product;
		},
		updateProduct: async (
			_parent: unknown,
			args: {
				id: string;
				name?: string;
				category?: string;
				imageUrl?: string;
				calories?: number;
				fat?: number;
				carbs?: number;
				protein?: number;
				description?: string;
			},
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			// Check ownership
			const existing = await context.prisma.product.findUnique({
				where: { id: args.id },
			});

			if (!existing || existing.userId !== context.userId) {
				throw new Error('Product not found');
			}

			const product = await context.prisma.product.update({
				where: { id: args.id },
				data: {
					...(args.name !== undefined && { name: args.name }),
					...(args.category !== undefined && { category: args.category }),
					...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
					...(args.calories !== undefined && { calories: args.calories }),
					...(args.fat !== undefined && { fat: args.fat }),
					...(args.carbs !== undefined && { carbs: args.carbs }),
					...(args.protein !== undefined && { protein: args.protein }),
					...(args.description !== undefined && {
						description: args.description,
					}),
				},
			});

			return product;
		},
		deleteProduct: async (
			_parent: unknown,
			args: { id: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			// Check ownership
			const existing = await context.prisma.product.findUnique({
				where: { id: args.id },
			});

			if (!existing || existing.userId !== context.userId) {
				throw new Error('Product not found');
			}

			const product = await context.prisma.product.delete({
				where: { id: args.id },
			});

			return product;
		},
	},
};
