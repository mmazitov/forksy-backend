# Code Examples — Correct vs Incorrect

Reference this file before implementing new resolvers, services, or utilities for the Backend.

---

## architecture & Layers

### ❌ Fat Resolvers (Business logic intermixed)

```ts
// ❌ BAD — Resolver does everything directly
export const userResolvers = {
  Query: {
    getUserInfo: async (_, { id }, ctx) => {
      if (!ctx.user) throw new Error('Unauthenticated');
      // direct db access in resolver
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new Error('Not found');
      // custom logic
      user.viewCount += 1;
      await prisma.user.update({ where: { id }, data: { viewCount: user.viewCount } });
      return user;
    }
  }
}
```

```ts
// ✅ GOOD — Thin resolver, delegates to Service
export const userResolvers = {
  Query: {
    getUserInfo: async (_, { id }, { user }) => {
      if (!user) throw new GraphQLError('Unauthenticated', { ... });
      return UserService.getUserInfo(id, user.id);
    }
  }
}

// UserService.ts
export class UserService {
  static async getUserInfo(requestedId: string, requestorId: string) {
    // business logic, validation, db queries here
  }
}
```

---

## Performance (N+1)

### ❌ Missing DataLoader for nested fields

```ts
// ❌ BAD — Causes N+1 database queries
export const PostResolvers = {
  Post: {
    author: async (parent) => {
      return prisma.user.findUnique({ where: { id: parent.authorId } });
    }
  }
}
```

```ts
// ✅ GOOD — Use DataLoader from context
export const PostResolvers = {
  Post: {
    author: async (parent, _, ctx) => {
      return ctx.dataLoaders.userLoader.load(parent.authorId);
    }
  }
}
```

---

## Error Handling

### ❌ Leaking DB Errors

```ts
// ❌ BAD — Throws raw prisma error to the client
async function createUser(data) {
  return await prisma.user.create({ data }); 
  // If email exists, client gets "Unique constraint failed on the fields: (`email`)"
}
```

```ts
// ✅ GOOD — Map to user friendly errors
import { GraphQLError } from 'graphql';

async function createUser(data) {
  try {
    return await prisma.user.create({ data });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new GraphQLError('Email already in use', {
        extensions: { code: 'BAD_USER_INPUT' }
      });
    }
    throw error;
  }
}
```

---

## Prisma Patterns

### ❌ Selecting everything

```ts
// ❌ BAD — Fetching the entire row when only ID and Name is needed
const users = await prisma.user.findMany();
const names = users.map(u => u.name);
```

```ts
// ✅ GOOD — Select only required fields to save DB memory & network
const users = await prisma.user.findMany({
  select: { id: true, name: true }
});
```
