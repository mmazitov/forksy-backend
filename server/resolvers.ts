import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Context } from './context.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';


const isAdmin = async (userId: string, prisma: Context['prisma']) => {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	return user?.role === 'admin';
};

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
				userId?: string;
			},
			context: Context,
		) => {
			const products = await context.prisma.product.findMany({
				where: {
					...(args.category && { category: args.category }),
					...(args.search && {
						name: { contains: args.search, mode: 'insensitive' },
					}),
					...(args.userId && { userId: args.userId }),
				},
				take: args.limit,
				skip: args.offset || 0,
				orderBy: { createdAt: 'desc' },
			});

			return products;
		},
		favoriteProducts: async (
			_parent: unknown,
			_args: unknown,
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const user = await context.prisma.user.findUnique({
				where: { id: context.userId },
				include: {
					favoriteProducts: {
						orderBy: {
							createdAt: 'desc',
						},
					},
				},
			});

			return user?.favoriteProducts || [];
		},
		dish: async (_parent: unknown, args: { id: string }, context: Context) => {
			const dish = await context.prisma.dish.findUnique({
				where: { id: args.id },
			});

			return dish;
		},
		dishes: async (
			_parent: unknown,
			args: {
				category?: string;
				search?: string;
				limit?: number;
				offset?: number;
				userId?: string;
			},
			context: Context,
		) => {
			const dishes = await context.prisma.dish.findMany({
				where: {
					...(args.category && { category: args.category }),
					...(args.search && {
						name: { contains: args.search, mode: 'insensitive' },
					}),
					...(args.userId && { userId: args.userId }),
				},
				take: args.limit,
				skip: args.offset || 0,
				orderBy: { createdAt: 'desc' },
			});

			return dishes;
		},
		favoriteDishes: async (
			_parent: unknown,
			_args: unknown,
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const user = await context.prisma.user.findUnique({
				where: { id: context.userId },
				include: {
					favoriteDishes: {
						orderBy: {
							createdAt: 'desc',
						},
					},
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

			// Check ownership or admin rights
			const existing = await context.prisma.product.findUnique({
				where: { id: args.id },
			});

			if (!existing) {
				throw new Error('Product not found');
			}

			const userIsAdmin = await isAdmin(context.userId, context.prisma);
			if (existing.userId !== context.userId && !userIsAdmin) {
				throw new Error('Not authorized to edit this product');
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

			// Check ownership or admin rights
			const existing = await context.prisma.product.findUnique({
				where: { id: args.id },
			});

			if (!existing) {
				throw new Error('Product not found');
			}

			const userIsAdmin = await isAdmin(context.userId, context.prisma);
			if (existing.userId !== context.userId && !userIsAdmin) {
				throw new Error('Not authorized to delete this product');
			}

			const product = await context.prisma.product.delete({
				where: { id: args.id },
			});

			return product;
		},
		addToFavoritesProduct: async (
			_parent: unknown,
			args: { productId: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const product = await context.prisma.product.findUnique({
				where: { id: args.productId },
			});

			if (!product) {
				throw new Error('Product not found');
			}

			const user = await context.prisma.user.update({
				where: { id: context.userId },
				data: {
					favoriteProducts: {
						connect: { id: args.productId },
					},
				},
				include: {
					favoriteProducts: true,
				},
			});

			return user;
		},
		removeFromFavoritesProduct: async (
			_parent: unknown,
			args: { productId: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const user = await context.prisma.user.update({
				where: { id: context.userId },
				data: {
					favoriteProducts: {
						disconnect: { id: args.productId },
					},
				},
				include: {
					favoriteProducts: true,
				},
			});

			return user;
		},
		createDish: async (
			_parent: unknown,
			args: {
				name: string;
				category?: string;
				imageUrl?: string;
				ingredients: { name: string; amount: string }[];
				instructions: string[];
				prepTime?: number;
				servings?: number;
				calories?: number;
				protein?: number;
				fat?: number;
				carbs?: number;
				description?: string;
			},
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const dish = await context.prisma.dish.create({
				data: {
					name: args.name,
					category: args.category,
					imageUrl: args.imageUrl,
					ingredients: args.ingredients,
					instructions: args.instructions,
					prepTime: args.prepTime,
					servings: args.servings,
					calories: args.calories,
					protein: args.protein,
					fat: args.fat,
					carbs: args.carbs,
					description: args.description,
					userId: context.userId,
				},
			});

			return dish;
		},
		updateDish: async (
			_parent: unknown,
			args: {
				id: string;
				name?: string;
				category?: string;
				imageUrl?: string;
				ingredients?: { name: string; amount: string }[];
				instructions?: string[];
				prepTime?: number;
				servings?: number;
				calories?: number;
				protein?: number;
				fat?: number;
				carbs?: number;
				description?: string;
			},
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const existing = await context.prisma.dish.findUnique({
				where: { id: args.id },
			});

			if (!existing) {
				throw new Error('Dish not found');
			}

			const userIsAdmin = await isAdmin(context.userId, context.prisma);
			if (existing.userId !== context.userId && !userIsAdmin) {
				throw new Error('Not authorized to edit this dish');
			}

			const dish = await context.prisma.dish.update({
				where: { id: args.id },
				data: {
					...(args.name !== undefined && { name: args.name }),
					...(args.category !== undefined && { category: args.category }),
					...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
					...(args.ingredients !== undefined && { ingredients: args.ingredients }),
					...(args.instructions !== undefined && { instructions: args.instructions }),
					...(args.prepTime !== undefined && { prepTime: args.prepTime }),
					...(args.servings !== undefined && { servings: args.servings }),
					...(args.calories !== undefined && { calories: args.calories }),
					...(args.protein !== undefined && { protein: args.protein }),
					...(args.fat !== undefined && { fat: args.fat }),
					...(args.carbs !== undefined && { carbs: args.carbs }),
					...(args.description !== undefined && { description: args.description }),
				},
			});

			return dish;
		},
		deleteDish: async (
			_parent: unknown,
			args: { id: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const existing = await context.prisma.dish.findUnique({
				where: { id: args.id },
			});

			if (!existing) {
				throw new Error('Dish not found');
			}

			const userIsAdmin = await isAdmin(context.userId, context.prisma);
			if (existing.userId !== context.userId && !userIsAdmin) {
				throw new Error('Not authorized to delete this dish');
			}

			const dish = await context.prisma.dish.delete({
				where: { id: args.id },
			});

			return dish;
		},
		addToFavoritesDish: async (
			_parent: unknown,
			args: { dishId: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const dish = await context.prisma.dish.findUnique({
				where: { id: args.dishId },
			});

			if (!dish) {
				throw new Error('Dish not found');
			}

			const user = await context.prisma.user.update({
				where: { id: context.userId },
				data: {
					favoriteDishes: {
						connect: { id: args.dishId },
					},
				},
				include: {
					favoriteDishes: true,
				},
			});

			return user;
		},
		removeFromFavoritesDish: async (
			_parent: unknown,
			args: { dishId: string },
			context: Context,
		) => {
			if (!context.userId) {
				throw new Error('Not authenticated');
			}

			const user = await context.prisma.user.update({
				where: { id: context.userId },
				data: {
					favoriteDishes: {
						disconnect: { id: args.dishId },
					},
				},
				include: {
					favoriteDishes: true,
				},
			});

			return user;
		},
	},
	Product: {
		isFavorite: async (parent: { id: string }, _args: unknown, context: Context) => {
			if (!context.userId) {
				return false;
			}

			const user = await context.prisma.user.findUnique({
				where: { id: context.userId },
				include: {
					favoriteProducts: {
						where: { id: parent.id },
					},
				},
			});

			return user?.favoriteProducts.length ? true : false;
		},
	},
	Dish: {
		isFavorite: async (parent: { id: string }, _args: unknown, context: Context) => {
			if (!context.userId) {
				return false;
			}

			const user = await context.prisma.user.findUnique({
				where: { id: context.userId },
				include: {
					favoriteDishes: {
						where: { id: parent.id },
					},
				},
			});

			return user?.favoriteDishes.length ? true : false;
		},
	},
};
