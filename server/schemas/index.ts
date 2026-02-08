import { mergeTypeDefs } from '@graphql-tools/merge';
import { gql } from 'graphql-tag';

import { dishTypeDefs } from './dish';
import { productTypeDefs } from './product';
import { userTypeDefs } from './user';

// Базовые типы Query и Mutation
const baseTypeDefs = gql`
	type Query {
		_empty: String
	}

	type Mutation {
		_empty: String
	}
`;

export const typeDefs = mergeTypeDefs([
	baseTypeDefs,
	userTypeDefs,
	productTypeDefs,
	dishTypeDefs,
]);