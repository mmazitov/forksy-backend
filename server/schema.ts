import { gql } from 'graphql-tag';

export const typeDefs = gql`
	type User {
		id: ID!
		role: String
		email: String
		name: String
		avatar: String
		phone: String
		diet: String
		allergy: [String!]!
		dislike: [String!]!
		googleId: String
		githubId: String
		facebookId: String
		createdAt: String!
		updatedAt: String!
		favoriteProducts: [Product!]!
		favoriteDishes: [Dish!]!
	}

	type Product {
		id: ID!
		name: String!
		category: String
		imageUrl: String
		calories: Int
		fat: Float
		carbs: Float
		protein: Float
		description: String
		createdAt: String!
		updatedAt: String!
		userId: ID!
		isFavorite: Boolean
	}

	type Dish {
		id: ID!
		name: String!
		category: String
		imageUrl: String
		ingredients: [String!]!
		instructions: [String!]!
		cookTime: Int
		calories: Int
		fat: Float
		carbs: Float
		protein: Float
		portionSize: Int
		notes: String
		description: String
		createdAt: String!
		updatedAt: String!
		userId: ID!
		isFavorite: Boolean
	}

	type AuthPayload {
		token: String!
		user: User!
	}

	type Query {
		me: User
		product(id: ID!): Product
		products(
			category: String
			search: String
			limit: Int
			offset: Int
		): [Product!]!
		favoriteProducts: [Product!]!
		favoriteDishes: [Dish!]!
	}

	type Mutation {
		register(email: String!, password: String!, name: String): AuthPayload!
		login(email: String!, password: String!): AuthPayload!
		updateProfile(
			name: String
			phone: String
			avatar: String
			diet: String
			allergy: [String!]
			dislike: [String!]
		): User!
		createProduct(
			name: String!
			category: String
			imageUrl: String
			calories: Int
			fat: Float
			carbs: Float
			protein: Float
			description: String
		): Product!
		updateProduct(
			id: ID!
			name: String
			category: String
			imageUrl: String
			calories: Int
			fat: Float
			carbs: Float
			protein: Float
			description: String
		): Product!
		addToFavoritesProductProduct(productId: ID!): User!
		removeFromFavoritesProduct(productId: ID!): User!
		deleteProduct(id: ID!): Product!
		createDish(
			name: String!
			category: String
			imageUrl: String
			ingredients: [String!]!
			instructions: [String!]!
			cookTime: Int
			calories: Int
			fat: Float
			carbs: Float
			protein: Float
			portionSize: Int
			notes: String
			description: String
		): Dish!
		updateDish(
			id: ID!
			name: String
			category: String
			imageUrl: String
			ingredients: [String!]
			instructions: [String!]
			cookTime: Int
			calories: Int
			fat: Float
			carbs: Float
			protein: Float
			portionSize: Int
			notes: String
			description: String
		): Dish!
		addToFavoritesDish(dishId: ID!): User!
		removeFromFavoritesDish(dishId: ID!): User!
		deleteDish(id: ID!): Dish!
	}

	type SocialAuthPayload {
		token: String!
		user: User!
	}

	extend type Mutation {
		handleOAuthCallback(provider: String!, code: String!): SocialAuthPayload!
	}
`;
