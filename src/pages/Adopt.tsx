import React, { useState } from 'react';
import { Heart, Calendar, MapPin, Phone, Mail } from 'lucide-react';

interface AdoptionPet {
  id: string;
  name: string;
  species: string;
  age: string;
  gender: string;
  breed: string;
  image: string;
  description: string;
  personality: string[];
  location: string;
  contactEmail: string;
  contactPhone: string;
  adoptionFee: number;
}

const Adopt: React.FC = () => {
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<AdoptionPet | null>(null);

  const adoptionPets: AdoptionPet[] = [
    {
      id: 'adopt-1',
      name: 'Rocky',
      species: 'Dog',
      age: '5 years',
      gender: 'Male',
      breed: 'Mixed Breed',
      image: 'https://images.pexels.com/photos/1458925/pexels-photo-1458925.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Rocky is a gentle soul looking for a loving home. He loves long walks and belly rubs.',
      personality: ['Gentle', 'Loyal', 'Calm'],
      location: 'Local Animal Shelter',
      contactEmail: 'shelter@example.com',
      contactPhone: '(555) 123-4567',
      adoptionFee: 150
    },
    {
      id: 'adopt-2',
      name: 'Mia',
      species: 'Cat',
      age: '3 years',
      gender: 'Female',
      breed: 'Tabby',
      image: 'https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Mia is a sweet cat who loves to purr and play with toys. She would do great in a quiet home.',
      personality: ['Sweet', 'Playful', 'Independent'],
      location: 'City Animal Rescue',
      contactEmail: 'rescue@example.com',
      contactPhone: '(555) 987-6543',
      adoptionFee: 100
    },
    {
      id: 'adopt-3',
      name: 'Bailey',
      species: 'Dog',
      age: '2 years',
      gender: 'Female',
      breed: 'Labrador Mix',
      image: 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Bailey is energetic and loves to play fetch. She would be perfect for an active family.',
      personality: ['Energetic', 'Friendly', 'Playful'],
      location: 'Happy Paws Rescue',
      contactEmail: 'happypaws@example.com',
      contactPhone: '(555) 456-7890',
      adoptionFee: 200
    },
    {
      id: 'adopt-4',
      name: 'Oliver',
      species: 'Cat',
      age: '1 year',
      gender: 'Male',
      breed: 'Orange Tabby',
      image: 'https://images.pexels.com/photos/1056251/pexels-photo-1056251.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Oliver is a young, curious cat who loves to explore and play. He gets along well with other cats.',
      personality: ['Curious', 'Social', 'Active'],
      location: 'Feline Friends Rescue',
      contactEmail: 'feline@example.com',
      contactPhone: '(555) 321-0987',
      adoptionFee: 125
    },
    {
      id: 'adopt-5',
      name: 'Sadie',
      species: 'Dog',
      age: '7 years',
      gender: 'Female',
      breed: 'Golden Retriever',
      image: 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Sadie is a senior dog with so much love to give. She enjoys gentle walks and cozy naps.',
      personality: ['Gentle', 'Loving', 'Calm'],
      location: 'Senior Pet Sanctuary',
      contactEmail: 'senior@example.com',
      contactPhone: '(555) 654-3210',
      adoptionFee: 75
    },
    {
      id: 'adopt-6',
      name: 'Smokey',
      species: 'Cat',
      age: '4 years',
      gender: 'Male',
      breed: 'Gray Shorthair',
      image: 'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Smokey is a laid-back cat who loves to lounge in sunny spots and receive gentle pets.',
      personality: ['Relaxed', 'Affectionate', 'Quiet'],
      location: 'Community Cat Rescue',
      contactEmail: 'cats@example.com',
      contactPhone: '(555) 789-0123',
      adoptionFee: 90
    }
  ];

  const categories = [
    { id: 'all', name: 'All Pets' },
    { id: 'Dog', name: 'Dogs' },
    { id: 'Cat', name: 'Cats' },
  ];

  const filteredPets = selectedSpecies === 'all' 
    ? adoptionPets 
    : adoptionPets.filter(pet => pet.species === selectedSpecies);

  const handleContactClick = (pet: AdoptionPet) => {
    setSelectedPet(pet);
    setShowContactModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Adopt a Pet</h1>
          <p className="text-xl text-gray-600">Give a loving home to a pet in need</p>
        </div>

        {/* Info Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Why Adopt?</h2>
          <p className="text-green-700">
            When you adopt a pet, you're saving a life and making room for another animal in need. 
            All adoption pets are spayed/neutered, vaccinated, and health-checked.
          </p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedSpecies(category.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedSpecies === category.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-green-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Pets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative">
                <img
                  src={pet.image}
                  alt={pet.name}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Adopt
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
                  <span className="text-2xl font-bold text-green-600">${pet.adoptionFee}</span>
                </div>
                <p className="text-gray-600 mb-1">{pet.breed}</p>
                <p className="text-gray-500 text-sm mb-4">{pet.age} • {pet.gender} • {pet.species}</p>
                <p className="text-gray-700 mb-4">{pet.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {pet.personality.map((trait, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {pet.location}
                </div>
                <button
                  onClick={() => handleContactClick(pet)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  <span>Contact for Adoption</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Modal */}
        {showContactModal && selectedPet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Contact for {selectedPet.name}</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-gray-600">{selectedPet.contactEmail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">{selectedPet.contactPhone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-gray-600">{selectedPet.location}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Adoption Fee</p>
                    <p className="text-gray-600">${selectedPet.adoptionFee}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.location.href = `mailto:${selectedPet.contactEmail}`}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Adopt;