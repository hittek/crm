
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const methods = {
    GET: async (req, res) => {
        const { id } = req.query
        // Get a single customer by ID
        const customer = await prisma.customer.findUnique({
            where: { id: parseInt(id, 10) },
        })
        if (customer) {
            res.json(customer)
        } else {
            res.status(404).json({ error: 'Customer not found' })
        }
    },
    PUT: async (req, res) => {
        const { id } = req.query
        // Update a customer by ID
        const { name, email, phone, address } = req.body
        try {
            const customer = await prisma.customer.update({
                where: { id: parseInt(id, 10) },
                data: { name, email, phone, address },
            })
            res.json(customer)
        } catch (error) {
            res.status(404).json({ error: 'Customer not found or unable to update' })
        }
    },
    DELETE: async (req, res) => {
        const { id } = req.query
        // Delete a customer by ID
        try {
            await prisma.customer.delete({
                where: { id: parseInt(id, 10) },
            })
            res.status(204).end()
        } catch (error) {
            res.status(404).json({ error: 'Customer not found' })
        }
    },
}

export default async function handler(req, res) {
    const method = methods[req.method]
    if (method) {
        try {
            await method(req, res)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error: 'Internal Server Error' })
        }
    } else {
        res.setHeader('Allow', Object.keys(methods))
        res.status(405).end(`Method ${req.method} Not Allowed`)
    }
}
