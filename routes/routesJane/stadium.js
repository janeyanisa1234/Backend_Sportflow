import express from 'express'
import { getAllStadiumRequests, updateStadiumStatus } from '../../Database/dbjane/stadium.js'

const router = express.Router()

// Get all stadium requests
router.get('/requests', async (req, res) => {
    try {
        const stadiums = await getAllStadiumRequests()
        res.json(stadiums)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Update stadium status
router.put('/status/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        // ตรวจสอบ id
        if (!id) {
            return res.status(400).json({ error: 'Stadium ID is required' })
        }

        // ตรวจสอบ status
        if (!status) {
            return res.status(400).json({ error: 'Status is required' })
        }

        const updatedStadium = await updateStadiumStatus(id, status)
        res.json(updatedStadium)
    } catch (error) {
        console.error('Error updating stadium status:', error)
        res.status(500).json({ error: error.message })
    }
})

export default router