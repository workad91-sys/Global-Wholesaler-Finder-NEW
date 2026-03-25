/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, MapPin, Globe, Loader2, ExternalLink, Building2, Info, Mail, Copy, Check, Filter, Sparkles, X, User, Phone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findWholesalers, Wholesaler, generatePersonalizedEmail } from './services/geminiService';

interface Result {
  region: string;
  wholesalers: Wholesaler[];
  chunks: any[];
}

const WORLDWIDE_REGIONS: Record<string, string[]> = {
  "Europe": ["Spain", "Portugal", "France", "Italy", "Germany", "UK", "Netherlands", "Belgium", "Switzerland", "Austria", "Greece", "Turkey", "Poland", "Sweden", "Norway", "Denmark"],
  "Middle East & Africa": ["Saudi Arabia", "UAE", "Qatar", "Egypt", "Morocco", "South Africa", "Nigeria", "Kenya", "Jordan", "Kuwait", "Oman"],
  "Americas": ["USA", "Canada", "Mexico", "Colombia", "Argentina", "Peru", "Chile", "Ecuador", "Guatemala", "Costa Rica", "Panama", "Dominican Republic", "Uruguay", "Bolivia", "Paraguay", "Brazil"],
  "Asia & Oceania": ["China", "Japan", "South Korea", "India", "Thailand", "Vietnam", "Indonesia", "Malaysia", "Singapore", "Australia", "New Zealand", "Philippines"]
};

const ALL_COUNTRIES = Object.values(WORLDWIDE_REGIONS).flat();

export default function App() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [leadType, setLeadType] = useState<'inbound' | 'outbound' | 'both' | 'logistics' | 'local_operator' | 'dried_fruits_nuts' | 'dates_supplier' | 'food_distributor' | 'fmcg_wholesaler'>('both');
  const [specialization, setSpecialization] = useState('');
  const [senderName, setSenderName] = useState('');
  const [emailLanguage, setEmailLanguage] = useState('English');
  const [customPoints, setCustomPoints] = useState('');
  const [leadsCount, setLeadsCount] = useState(5);
  const [contactedLeads, setContactedLeads] = useState<string[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState(0);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);

  // Persistence for contacted leads
  React.useEffect(() => {
    const saved = localStorage.getItem('contactedLeads');
    if (saved) {
      try {
        setContactedLeads(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse contactedLeads", e);
      }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('contactedLeads', JSON.stringify(contactedLeads));
  }, [contactedLeads]);
  
  // Email generation state
  const [generatingEmailFor, setGeneratingEmailFor] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<{ wholesaler: string, subject: string, body: string } | null>(null);

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region) 
        : [...prev, region]
    );
  };

  const startSearch = async () => {
    if (selectedRegions.length === 0) {
      setError("Please select at least one country to search.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    setTotalFound(0);
    
    try {
      for (const region of selectedRegions) {
        setCurrentRegion(region);
        const res = await findWholesalers(region, leadType, leadsCount, specialization);
        
        setResults(prev => [...prev, { 
          region, 
          wholesalers: res.wholesalers, 
          chunks: res.chunks 
        }]);
        
        setTotalFound(prev => prev + res.wholesalers.length);
      }
    } catch (err: any) {
      setError("Failed to fetch data. Please check your connection or API key.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setCurrentRegion(null);
    }
  };

  const handleGenerateEmail = async (wholesaler: Wholesaler) => {
    if (!senderName.trim()) {
      alert("Please enter a sender name in the 'From' field.");
      return;
    }
    
    setGeneratingEmailFor(wholesaler.name);
    try {
      const email = await generatePersonalizedEmail(wholesaler, senderName, customPoints, emailLanguage);
      setGeneratedEmail({ 
        wholesaler: wholesaler.name, 
        subject: email.subject,
        body: email.body 
      });
    } catch (err) {
      console.error(err);
      alert("Failed to generate email.");
    } finally {
      setGeneratingEmailFor(null);
    }
  };

  const toggleContacted = (name: string) => {
    setContactedLeads(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name) 
        : [...prev, name]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <Globe className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Wholesaler Finder</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Global Tourism Leads</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold text-blue-600">{totalFound}</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Leads Found</div>
            </div>
            <button
              onClick={startSearch}
              disabled={isLoading || selectedRegions.length === 0}
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching {currentRegion}...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Find Wholesalers
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filter Section */}
        <section className="mb-10 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Country Filter */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold tracking-tight">Select Continents & Countries</h2>
                <span className="ml-auto text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {selectedRegions.length} Selected
                </span>
              </div>
              
              <div className="space-y-6 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(WORLDWIDE_REGIONS).map(([continent, countries]) => (
                  <div key={continent} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">{continent}</h3>
                      </div>
                      <button 
                        onClick={() => {
                          const allInContinent = countries.every(c => selectedRegions.includes(c));
                          if (allInContinent) {
                            setSelectedRegions(prev => prev.filter(c => !countries.includes(c)));
                          } else {
                            setSelectedRegions(prev => Array.from(new Set([...prev, ...countries])));
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded-md"
                      >
                        {countries.every(c => selectedRegions.includes(c)) ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {countries.map(region => (
                        <button
                          key={region}
                          onClick={() => toggleRegion(region)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                            selectedRegions.includes(region)
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-[1.02]'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                          }`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-50 flex gap-4">
                <button 
                  onClick={() => setSelectedRegions(selectedRegions.length === ALL_COUNTRIES.length ? [] : [...ALL_COUNTRIES])}
                  className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {selectedRegions.length === ALL_COUNTRIES.length ? 'Deselect All' : 'Select All Worldwide'}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Lead Type Filter */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold tracking-tight">Lead Type</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['both', 'inbound', 'outbound', 'logistics', 'local_operator', 'dried_fruits_nuts', 'dates_supplier', 'food_distributor', 'fmcg_wholesaler'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setLeadType(type)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                        leadType === type
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialization Field (Only for Local Operator) */}
              {leadType === 'local_operator' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold tracking-tight">Specialization (X Experience)</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Specify the type of tourism experience these local operators should specialize in.</p>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Adventure, Gastronomy, Luxury, Eco-tourism..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                </motion.div>
              )}

              {/* Sender Name, Language & Leads Number Field */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold tracking-tight">From (Sender Name)</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">This name will be used to sign the personalized emails.</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. ChatGPT"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold tracking-tight">Email Language</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">The language the AI will use to write the outreach email.</p>
                  <div className="relative">
                    <select
                      value={emailLanguage}
                      onChange={(e) => setEmailLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Italian">Italian</option>
                      <option value="Arabic">Arabic</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold tracking-tight">Leads Number</h2>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Number of leads to find per country.</p>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={leadsCount}
                      onChange={(e) => setLeadsCount(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Talking Points */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold tracking-tight">Custom Talking Points / Proposal</h2>
                </div>
                <p className="text-xs text-gray-400 mb-3">Add specific details or a partnership proposal you want the AI to include in the generated emails.</p>
                <textarea
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  placeholder="e.g. We offer exclusive 20% commission for new partners, or We specialize in luxury eco-tours in the Amazon..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Intro / Empty State */}
        {!isLoading && results.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-16 border border-gray-100 shadow-sm text-center"
          >
            <div className="max-w-xl mx-auto">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Building2 className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Identify Your Next Partners</h2>
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                Select target countries and lead types above and we'll find tourism wholesalers specializing in international group packages.
              </p>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl mb-8 flex items-center gap-3">
            <Info className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Results List */}
        <div className="space-y-16">
          <AnimatePresence mode="popLayout">
            {results.map((result, idx) => (
              <motion.section
                key={result.region}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 text-white p-2 rounded-lg shadow-md">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{result.region}</h3>
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-sm font-bold text-gray-400">{result.wholesalers.length} Leads</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {result.wholesalers.map((wholesaler, wIdx) => (
                    <motion.div
                      key={wIdx}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 flex items-start">
                        {contactedLeads.includes(wholesaler.name) && (
                          <div className="bg-red-600 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-bl-xl shadow-sm">
                            Contacted
                          </div>
                        )}
                        {wholesaler.type && (
                          <div className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${
                            contactedLeads.includes(wholesaler.name) ? '' : 'rounded-bl-xl'
                          } ${
                            wholesaler.type === 'inbound' ? 'bg-green-100 text-green-700' : 
                            wholesaler.type === 'outbound' ? 'bg-orange-100 text-orange-700' :
                            wholesaler.type === 'logistics' ? 'bg-blue-100 text-blue-700' :
                            wholesaler.type === 'local_operator' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {wholesaler.type?.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2 pr-12">
                          <h4 className="text-lg font-bold text-gray-900 leading-tight">{wholesaler.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">
                          {wholesaler.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          <button
                            onClick={() => toggleContacted(wholesaler.name)}
                            className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                              contactedLeads.includes(wholesaler.name) 
                                ? 'text-red-600 hover:text-red-700' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <Check className={`w-4 h-4 ${contactedLeads.includes(wholesaler.name) ? 'text-red-600' : 'text-gray-300'}`} />
                            {contactedLeads.includes(wholesaler.name) ? 'Remove Contacted' : 'Mark Contacted'}
                          </button>
                          
                          {wholesaler.website && (
                            <a
                              href={wholesaler.website.startsWith('http') ? wholesaler.website : `https://${wholesaler.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group"
                            >
                              <Globe className="w-4 h-4" />
                              <span className="truncate">Website</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          )}
                          
                          <button
                            onClick={() => handleGenerateEmail(wholesaler)}
                            disabled={generatingEmailFor === wholesaler.name}
                            className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50"
                          >
                            {generatingEmailFor === wholesaler.name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            Crafter Generator
                          </button>
                        </div>
                        
                        {wholesaler.email && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 truncate">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{wholesaler.email}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(wholesaler.email!)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                              title="Copy Email"
                            >
                              {copiedEmail === wholesaler.email ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        )}

                        {(wholesaler.phone || wholesaler.whatsapp) && (
                          <div className="flex flex-wrap gap-3 pt-1">
                            {wholesaler.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{wholesaler.phone}</span>
                              </div>
                            )}
                            {wholesaler.whatsapp && (
                              <a
                                href={wholesaler.whatsapp.includes('wa.me') || wholesaler.whatsapp.includes('whatsapp.com') 
                                  ? wholesaler.whatsapp 
                                  : `https://wa.me/${wholesaler.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Maps Grounding Links for the region */}
                {result.chunks.length > 0 && (
                  <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">
                      Verified Maps Sources
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {result.chunks.map((chunk, cIdx) => (
                        chunk.maps && (
                          <a
                            key={cIdx}
                            href={chunk.maps.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                          >
                            <MapPin className="w-3 h-3" />
                            {chunk.maps.title}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>
            ))}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        {results.length > 0 && !isLoading && (
          <div className="mt-24 pt-12 border-t border-gray-200 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-xs font-bold uppercase tracking-widest mb-4">
              <Globe className="w-3 h-3" />
              Search Complete
            </div>
            <p className="text-gray-400 text-sm">
              Data retrieved using Google Gemini 3 Flash with Google Maps Grounding.
            </p>
          </div>
        )}
      </main>

      {/* Email Modal */}
      <AnimatePresence>
        {generatedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-gray-900">Personalized Email</h3>
                    <p className="text-xs text-purple-600 font-medium">Generated for {generatedEmail.wholesaler}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setGeneratedEmail(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1 bg-white space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subject</span>
                    <button 
                      onClick={() => copyToClipboard(generatedEmail.subject)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      {copiedEmail === generatedEmail.subject ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 font-bold text-gray-900">
                    {generatedEmail.subject}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message Body</span>
                    <button 
                      onClick={() => copyToClipboard(generatedEmail.body)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      {copiedEmail === generatedEmail.body ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                  </div>
                  <div className="prose prose-purple max-w-none whitespace-pre-wrap font-serif text-lg leading-relaxed text-gray-800 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {generatedEmail.body}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => copyToClipboard(`${generatedEmail.subject}\n\n${generatedEmail.body}`)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 active:scale-95"
                >
                  {copiedEmail === `${generatedEmail.subject}\n\n${generatedEmail.body}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedEmail === `${generatedEmail.subject}\n\n${generatedEmail.body}` ? 'Copied Full Email!' : 'Copy Full Email'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
