import { gql } from 'graphql-tag';

export const plannerTypeDefs = gql`
	type PlannerItem {
		id: ID!
		userId: ID!
		dishId: ID!
		dish: Dish!
		day: String!
		mealTime: String!
		createdAt: String!
	}

	input PlannerItemInput {
		dishId: ID!
		day: String!
		mealTime: String!
	}

	extend type Query {
		getPlannerItems: [PlannerItem!]!
	}

	extend type Mutation {
		savePlanner(items: [PlannerItemInput!]!): Boolean!
	}
`;
