import {NextFunction, Request, Response} from 'express';
import app from "../../server/server";
import HttpError from "../../server/error/index";
import * as jwt from 'jsonwebtoken';
import {UserModelInterface} from "../../../database/models/user";
import * as User from '../../../database/dao/user'
import * as bcrypt from 'bcryptjs';
import * as dotEnv from 'dotenv'

dotEnv.config();

/**
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise < void >}
 */
export async function createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        const user = <UserModelInterface>{
            organization_id: req.body.organizationId,
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        };

        // Check for mandatory details
        if (user.organization_id === undefined || user.name === undefined || user.email === undefined || user.password === undefined) {
            throw new Error('Missing details!');
        }


        // Look for existence
        const query: UserModelInterface = await User.findOne(<UserModelInterface>user);
        if (query) {
            throw new Error('This email already exists');
        }


        // Hash password before database insert
        const salt: string = await bcrypt.genSalt(10);
        const hash: string = await bcrypt.hash(user.password, salt);
        user.password = hash;


        // This will insert new user into database
        const saved: UserModelInterface = await User.create(user);
        console.log('new user created: ' + saved);


        const token: string = jwt.sign({
            user_name: saved.name,
            id: saved.id,
            email: saved.email
        }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        res.json({
            status: 200,
            token: token,
            message: 'Account created successfully'
        });

    } catch (error) {
        if (error.code === 500) {
            return next(new HttpError(error.message.status, error.message));
        }
        res.json({
            status: 400,
            message: error.message
        });
    }
}


/**
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {Promise < void >}
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {

        // Details from post body
        const user = <UserModelInterface>{
            email: req.body.email,
            password: req.body.password
        };

        // Check for mandatory details
        if (user.email === undefined || user.password === undefined) {
            throw new Error('Missing login details!');
        }

        // Find user with email
        const dbUser: UserModelInterface = await User.findOne(<UserModelInterface>user);


        const isMatched: boolean = await bcrypt.compare(user.password, dbUser.password);
        if (isMatched) {

            const token: string = jwt.sign({
                user_name: dbUser.name,
                id: dbUser.id,
                email: dbUser.email
            }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRE
            });

            res.json({
                name: dbUser.name,
                email: dbUser.email,
                status: 200,
                token: token,
                message: 'Login authentication success'
            });
        } else {
            throw new Error('Invalid password or email');
        }

    } catch (error) {
        if (error.code === 500) {
            return next(new HttpError(error.message.status, error.message));
        }
        res.json({
            status: 400,
            message: error.message
        });
    }
}
