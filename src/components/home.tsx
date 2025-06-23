import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Shield,
  MessageCircle,
  Star,
  Users,
  Zap,
  Heart,
  Search,
  Plus,
} from "lucide-react";

function Home() {
  const featuredListings = [
    {
      id: 1,
      title: "Professional Camera Kit",
      description: "Canon EOS R5 with lenses",
      image:
        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&q=80",
      category: "Electronics",
      location: "San Francisco, CA",
      wantedItems: ["Laptop", "Drone"],
    },
    {
      id: 2,
      title: "Vintage Guitar Collection",
      description: "3 acoustic guitars in excellent condition",
      image:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
      category: "Music",
      location: "Austin, TX",
      wantedItems: ["Amplifier", "Recording Equipment"],
    },
    {
      id: 3,
      title: "Home Gym Equipment",
      description: "Complete weight set with bench",
      image:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
      category: "Fitness",
      location: "Los Angeles, CA",
      wantedItems: ["Bicycle", "Outdoor Gear"],
    },
  ];

  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "25K+", label: "Successful Trades" },
    { number: "50+", label: "Categories" },
    { number: "4.8★", label: "User Rating" },
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-tabadol-purple/10 to-tabadol-orange/10"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 font-blinker">
              Trade What You Have for
              <span className="gradient-text block mt-2">What You Need</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Join thousands of users in the world's most trusted barter
              marketplace. No money needed – just fair trades.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button className="btn-gradient text-lg px-8 py-4" asChild>
                <Link to="/listings">
                  <Search className="w-5 h-5 mr-2" />
                  Browse Listings
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-lg px-8 py-4 border-2"
                asChild
              >
                <Link to="/create-listing">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Listing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
              Making a Difference Together
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every trade helps build a more sustainable future
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2 font-blinker">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Environmental Impact */}
          <div className="mt-12 bg-green-50 rounded-2xl p-8 border border-green-200">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-green-800 mb-2 font-blinker">
                Environmental Impact
              </h3>
              <p className="text-green-700">
                Together, we're making a positive impact on our planet
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  62.5 tons
                </div>
                <div className="text-green-600">
                  Waste Diverted from Landfills
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  31.2 tons
                </div>
                <div className="text-green-600">CO2 Emissions Saved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  25,000+
                </div>
                <div className="text-green-600">Items Given New Life</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
              Featured Listings
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover amazing items available for trade right now
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {featuredListings.map((listing) => (
              <Card
                key={listing.id}
                className="card-hover cursor-pointer group"
              >
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={listing.image}
                    alt={listing.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800">
                    {listing.category}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-3 right-3 bg-white/90 hover:bg-white"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2 font-blinker">
                    {listing.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{listing.description}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    {listing.location}
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Looking for:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {listing.wantedItems.map((item, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button variant="outline" className="text-lg px-8 py-3" asChild>
              <Link to="/listings">
                View All Listings
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
              How TABADOL Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, secure, and fair trading in three easy steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-tabadol rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 font-blinker">
                1. List Your Item
              </h3>
              <p className="text-gray-600">
                Create a listing with photos and describe what you want in
                return. It's completely free to list!
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-tabadol rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 font-blinker">
                2. Connect & Chat
              </h3>
              <p className="text-gray-600">
                Browse listings and message other users. Our secure chat keeps
                your conversations safe.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-tabadol rounded-full mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 font-blinker">
                3. Make the Trade
              </h3>
              <p className="text-gray-600">
                Meet safely, exchange items, and rate each other. Build your
                reputation in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-blinker">
              Why Choose TABADOL?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for trust, designed for community
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <Shield className="w-12 h-12 text-tabadol-purple mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3 font-blinker">
                Secure & Safe
              </h3>
              <p className="text-gray-600">
                User verification, secure messaging, and community ratings keep
                everyone safe.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="w-12 h-12 text-tabadol-purple mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3 font-blinker">
                Trusted Community
              </h3>
              <p className="text-gray-600">
                Join thousands of verified users who have completed successful
                trades.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg hover:bg-gray-50 transition-colors">
              <Star className="w-12 h-12 text-tabadol-purple mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3 font-blinker">
                Quality Assured
              </h3>
              <p className="text-gray-600">
                Our rating system ensures quality trades and builds trust within
                the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-tabadol text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-blinker">
            Ready to Start Trading?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join our community today and discover the joy of bartering. Your
            next great trade is just a click away!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-tabadol-purple hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
              asChild
            >
              <Link to="/signup">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-tabadol-purple px-8 py-4 text-lg"
              asChild
            >
              <Link to="/listings">Browse Listings</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
