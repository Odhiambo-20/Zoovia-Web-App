import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Heart, Star } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  breed: string;
  age: string;
  price: number;
  image: string;
  description: string;
  personality: string[];
  gender: string;
  size: string;
}

const Dogs: React.FC = () => {
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const dogs: Pet[] = [
    {
      id: 'dog-1',
      name: 'Buddy',
      breed: 'Golden Retriever',
      age: '2 years',
      price: 1200,
      image: 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Friendly and energetic Golden Retriever, perfect for active families.',
      personality: ['Friendly', 'Energetic', 'Loyal'],
      gender: 'Male',
      size: 'Large'
    },
    {
      id: 'dog-2',
      name: 'Luna',
      breed: 'Border Collie',
      age: '1 year',
      price: 1000,
      image: 'https://images.pexels.com/photos/551628/pexels-photo-551628.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Intelligent and agile Border Collie, great for training and activities.',
      personality: ['Intelligent', 'Active', 'Obedient'],
      gender: 'Female',
      size: 'Medium'
    },
    {
      id: 'dog-3',
      name: 'Max',
      breed: 'German Shepherd',
      age: '3 years',
      price: 1500,
      image: 'https://images.pexels.com/photos/1490908/pexels-photo-1490908.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Protective and loyal German Shepherd, excellent guard dog.',
      personality: ['Protective', 'Loyal', 'Brave'],
      gender: 'Male',
      size: 'Large'
    },
    {
      id: 'dog-4',
      name: 'Bella',
      breed: 'Labrador Retriever',
      age: '6 months',
      price: 900,
      image: 'https://images.pexels.com/photos/1639729/pexels-photo-1639729.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Sweet Labrador puppy, loves to play and learn new tricks.',
      personality: ['Playful', 'Gentle', 'Smart'],
      gender: 'Female',
      size: 'Large'
    },
    {
      id: 'dog-5',
      name: 'Charlie',
      breed: 'Beagle',
      age: '2 years',
      price: 800,
      image: 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Friendly Beagle with a great nose for adventure.',
      personality: ['Curious', 'Friendly', 'Gentle'],
      gender: 'Male',
      size: 'Medium'
    },
    {
      id: 'dog-6',
      name: 'Ruby',
      breed: 'French Bulldog',
      age: '1.5 years',
      price: 1800,
      image: 'https://images.pexels.com/photos/1629781/pexels-photo-1629781.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Adorable French Bulldog, perfect apartment companion.',
      personality: ['Calm', 'Affectionate', 'Adaptable'],
      gender: 'Female',
      size: 'Small'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Dogs' },
    { id: 'small', name: 'Small Breeds' },
    { id: 'medium', name: 'Medium Breeds' },
    { id: 'large', name: 'Large Breeds' },
  ];

  const filteredDogs = selectedCategory === 'all' 
    ? dogs 
    : dogs.filter(dog => dog.size.toLowerCase() === selectedCategory);

  const handleAddToCart = (dog: Pet) => {
    addToCart({
      id: dog.id,
      name: dog.name,
      price: dog.price,
      image: dog.image,
      category: 'dog'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Dogs & Puppies</h1>
          <p className="text-xl text-gray-600">Find your perfect canine companion</p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-blue-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Dogs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDogs.map((dog) => (
            <div
              key={dog.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative">
                <img
                  src={dog.image}
                  alt={dog.name}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <button className="bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors">
                    <Heart className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{dog.name}</h3>
                  <span className="text-2xl font-bold text-blue-600">${dog.price}</span>
                </div>
                <p className="text-gray-600 mb-1">{dog.breed}</p>
                <p className="text-gray-500 text-sm mb-4">{dog.age} • {dog.gender} • {dog.size}</p>
                <p className="text-gray-700 mb-4">{dog.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {dog.personality.map((trait, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  </div>
                  <button
                    onClick={() => handleAddToCart(dog)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dogs;