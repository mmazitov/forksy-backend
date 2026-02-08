import { gql } from 'graphql-tag';

export const userTypeDefs = gql`
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

	type AuthPayload {
		token: String!
		user: User!
	}

	type SocialAuthPayload {
		token: String!
		user: User!
	}

	extend type Query {
		me: User
	}

	extend type Mutation {
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
		handleOAuthCallback(provider: String!, code: String!): SocialAuthPayload!
	}
`;