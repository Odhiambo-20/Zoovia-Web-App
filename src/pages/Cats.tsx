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

const Cats: React.FC = () => {
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const cats: Pet[] = [
    {
      id: 'cat-1',
      name: 'Whiskers',
      breed: 'Persian',
      age: '2 years',
      price: 800,
      image: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Gentle and affectionate Persian cat, loves to cuddle.',
      personality: ['Calm', 'Affectionate', 'Quiet'],
      gender: 'Female',
      size: 'Medium'
    },
    {
      id: 'cat-2',
      name: 'Shadow',
      breed: 'Maine Coon',
      age: '3 years',
      price: 1200,
      image: 'https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Majestic Maine Coon with a gentle giant personality.',
      personality: ['Gentle', 'Playful', 'Social'],
      gender: 'Male',
      size: 'Large'
    },
    {
      id: 'cat-3',
      name: 'Luna',
      breed: 'Siamese',
      age: '1 year',
      price: 700,
      image: 'https://images.pexels.com/photos/1056251/pexels-photo-1056251.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Vocal and intelligent Siamese, very interactive.',
      personality: ['Vocal', 'Intelligent', 'Active'],
      gender: 'Female',
      size: 'Medium'
    },
    {
      id: 'cat-4',
      name: 'Mittens',
      breed: 'British Shorthair',
      age: '4 years',
      price: 900,
      image: 'https://images.pexels.com/photos/1643456/pexels-photo-1643456.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Calm British Shorthair, perfect for quiet homes.',
      personality: ['Independent', 'Calm', 'Loyal'],
      gender: 'Male',
      size: 'Medium'
    },
    {
      id: 'cat-5',
      name: 'Cleo',
      breed: 'Ragdoll',
      age: '6 months',
      price: 1000,
      image: 'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Sweet Ragdoll kitten, loves being held and cuddled.',
      personality: ['Docile', 'Affectionate', 'Gentle'],
      gender: 'Female',
      size: 'Large'
    },
    {
      id: 'cat-6',
      name: 'Felix',
      breed: 'Scottish Fold',
      age: '1.5 years',
      price: 1100,
      image: 'https://images.pexels.com/photos/1687831/pexels-photo-1687831.jpeg?auto=compress&cs=tinysrgb&w=600',
      description: 'Adorable Scottish Fold with distinctive folded ears.',
      personality: ['Sweet', 'Calm', 'Playful'],
      gender: 'Male',
      size: 'Medium'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Cats' },
    { id: 'kittens', name: 'Kittens' },
    { id: 'longhair', name: 'Long Hair' },
    { id: 'shorthair', name: 'Short Hair' },
  ];

  const filteredCats = selectedCategory === 'all' 
    ? cats 
    : selectedCategory === 'kittens'
    ? cats.filter(cat => cat.age.includes('months') || cat.age === '1 year')
    : selectedCategory === 'longhair'
    ? cats.filter(cat => ['Persian', 'Maine Coon', 'Ragdoll'].includes(cat.breed))
    : cats.filter(cat => ['Siamese', 'British Shorthair', 'Scottish Fold'].includes(cat.breed));

  const handleAddToCart = (cat: Pet) => {
    addToCart({
      id: cat.id,
      name: cat.name,
      price: cat.price,
      image: cat.image,
      category: 'cat'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cats & Kittens</h1>
          <p className="text-xl text-gray-600">Find your perfect feline friend</p>
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

        {/* Cats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCats.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative">
                <img
                  src={cat.image}
                  alt={cat.name}
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
                  <h3 className="text-xl font-bold text-gray-900">{cat.name}</h3>
                  <span className="text-2xl font-bold text-blue-600">${cat.price}</span>
                </div>
                <p className="text-gray-600 mb-1">{cat.breed}</p>
                <p className="text-gray-500 text-sm mb-4">{cat.age} • {cat.gender} • {cat.size}</p>
                <p className="text-gray-700 mb-4">{cat.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {cat.personality.map((trait, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
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
                    onClick={() => handleAddToCart(cat)}
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

export default Cats;