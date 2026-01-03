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
		favoriteProducts: [Product!]!
		): [Product!]!
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
		addToFavorites(productId: ID!): User!
		removeFromFavorites(productId: ID!): User!
		deleteProduct(id: ID!): Product!
	}

	type SocialAuthPayload {
		token: String!
		user: User!
	}

	extend type Mutation {
		handleOAuthCallback(provider: String!, code: String!): SocialAuthPayload!
	}
`;
