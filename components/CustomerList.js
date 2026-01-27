
import { useState, useEffect } from 'react'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '' })
  const [editingCustomer, setEditingCustomer] = useState(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    const res = await fetch('/api/customers')
    const data = await res.json()
    setCustomers(data)
  }

  const handleAddCustomer = async () => {
    await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCustomer),
    })
    setNewCustomer({ name: '', email: '', phone: '', address: '' })
    fetchCustomers()
  }

  const handleEditCustomer = async (customer) => {
    await fetch(`/api/customers/${customer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customer),
    })
    setEditingCustomer(null)
    fetchCustomers()
  }

  const handleDeleteCustomer = async (id) => {
    await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
    })
    fetchCustomers()
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Name"
          value={newCustomer.name}
          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
          className="mr-2 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Email"
          value={newCustomer.email}
          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
          className="mr-2 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Phone"
          value={newCustomer.phone}
          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
          className="mr-2 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Address"
          value={newCustomer.address}
          onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
          className="mr-2 p-2 border rounded"
        />
        <button
          onClick={handleAddCustomer}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-700"
        >
          Add Customer
        </button>
      </div>

      <table className="min-w-full bg-white border rounded-md">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Phone</th>
            <th className="py-2 px-4 border-b">Address</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b">
              <td className="py-2 px-4">{customer.name}</td>
              <td className="py-2 px-4">{customer.email}</td>
              <td className="py-2 px-4">{customer.phone}</td>
              <td className="py-2 px-4">{customer.address}</td>
              <td className="py-2 px-4 flex space-x-2">
                <button
                  onClick={() => setEditingCustomer(customer)}
                  className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCustomer(customer.id)}
                  className="bg-red-500 text-white p-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingCustomer && (
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Edit Customer</h2>
          <input
            type="text"
            placeholder="Name"
            value={editingCustomer.name}
            onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
            className="mr-2 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Email"
            value={editingCustomer.email}
            onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
            className="mr-2 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Phone"
            value={editingCustomer.phone}
            onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
            className="mr-2 p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Address"
            value={editingCustomer.address}
            onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
            className="mr-2 p-2 border rounded"
          />
          <button
            onClick={() => handleEditCustomer(editingCustomer)}
            className="bg-green-500 text-white p-2 rounded hover:bg-green-700 ml-2"
          >
            Save
          </button>
          <button
            onClick={() => setEditingCustomer(null)}
            className="bg-gray-500 text-white p-2 rounded hover:bg-gray-700 ml-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
