import { body, param } from 'express-validator';

export const userrValidator = {
    createUser: [
        body('email').notEmpty().withMessage("Email is required").isEmail().withMessage('Invalid email format'),
        body('fullName').notEmpty().withMessage('Full name is required')
    ],
    validUserID: [
        param('id').isUUID().withMessage('Invalid user ID format.'),
    ],
}