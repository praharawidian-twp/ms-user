import { db } from '../../db/db';
import { usersTable, User } from '../../db/schemas/users';
import { eq } from 'drizzle-orm';

export const createUser = async (user: User): Promise<User> => {
    try {
        const [createdUser] = await db.insert(usersTable).values(user).returning();
        return createdUser;
    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user.');
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const users = await db.select().from(usersTable);
        return users;
    } catch (error) {
        console.error('Error getting all users:', error);
        throw new Error('Failed to retrieve users.');
    }
};

export const getUserById = async (id: string): Promise<User | null> => {
    try {
        const user = await db.query.usersTable.findFirst({
            where: eq(usersTable.id, id)
        });
        return user || null;
    } catch (error) {
        console.error(`Error getting user by ID ${id}:`, error);
        throw new Error(`Failed to retrieve user with ID ${id}.`);
    }
};
