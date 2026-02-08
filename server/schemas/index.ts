import { mergeTypeDefs } from '@graphql-tools/merge';
import { gql } from 'graphql-tag';

import { dishTypeDefs } from './dish.js';
import { productTypeDefs } from './product.js';
import { userTypeDefs } from './user.js';

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