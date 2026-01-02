import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { createContext, type Context } from '../server/context.js';
import { resolvers } from '../server/resolvers.js';
import { typeDefs } from '../server/schema.js';

let server: ApolloServer<Context> | null = null;

function getServer(): ApolloServer<Context> {
	if (!server) {
		server = new ApolloServer<Context>({
			typeDefs,
			resolvers,
		});
	}
	return server;
}

export default startServerAndCreateNextHandler(getServer(), {
	context: async (req: any, res: any) => {
		return createContext({
			req,
			res,
		});
	},
});
