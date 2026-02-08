import { mergeResolvers } from '@graphql-tools/merge';

import { dishResolvers } from './dish.js';
import { productResolvers } from './product.js';
import { userResolvers } from './user.js';

export const resolvers = mergeResolvers([
	userResolvers,
	productResolvers,
	dishResolvers,
]);