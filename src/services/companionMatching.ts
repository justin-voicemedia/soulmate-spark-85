interface QuestionnaireData {
  companionType: string;
  gender: string;
  ageRange: string;
  hobbies: string[];
  personality: string[];
  relationshipGoals: string;
  name: string;
}

interface Companion {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  hobbies: string[];
  personality: string[];
  likes: string[];
  dislikes: string[];
  image_url: string;
  location: string;
}

interface CompanionMatch extends Companion {
  compatibilityScore: number;
  matchReasons: string[];
}

export class CompanionMatchingService {
  
  private parseAgeRange(ageRange: string): [number, number] {
    switch (ageRange) {
      case '18-25': return [18, 25];
      case '26-35': return [26, 35];
      case '36-45': return [36, 45];
      case '46+': return [46, 100];
      default: return [18, 100];
    }
  }

  private calculateHobbyCompatibility(userHobbies: string[], companionHobbies: string[]): number {
    if (userHobbies.length === 0 || companionHobbies.length === 0) return 0;
    
    const intersection = userHobbies.filter(hobby => 
      companionHobbies.some(ch => ch.toLowerCase().includes(hobby.toLowerCase()) || 
                                 hobby.toLowerCase().includes(ch.toLowerCase()))
    );
    
    return intersection.length / Math.max(userHobbies.length, companionHobbies.length);
  }

  private calculatePersonalityCompatibility(userTraits: string[], companionTraits: string[]): number {
    if (userTraits.length === 0 || companionTraits.length === 0) return 0;
    
    const intersection = userTraits.filter(trait => 
      companionTraits.some(ct => ct.toLowerCase().includes(trait.toLowerCase()) || 
                                trait.toLowerCase().includes(ct.toLowerCase()))
    );
    
    return intersection.length / Math.max(userTraits.length, companionTraits.length);
  }

  private getCompatibilityBonus(companionType: string, relationshipGoals: string, companion: Companion): number {
    let bonus = 0;
    
    // Companion type compatibility
    if (companionType === 'romantic' && relationshipGoals === 'romantic') {
      if (companion.personality.some(p => ['romantic', 'passionate', 'warm'].includes(p.toLowerCase()))) {
        bonus += 0.2;
      }
    }
    
    if (companionType === 'casual' && relationshipGoals === 'friendship') {
      if (companion.personality.some(p => ['friendly', 'casual', 'fun', 'energetic'].includes(p.toLowerCase()))) {
        bonus += 0.2;
      }
    }
    
    if (companionType === 'spiritual' && relationshipGoals === 'support') {
      if (companion.personality.some(p => ['peaceful', 'calm', 'spiritual', 'thoughtful'].includes(p.toLowerCase()))) {
        bonus += 0.2;
      }
    }
    
    // Location bonus (diverse companions from different places)
    if (companion.location && companion.location.includes(',')) {
      bonus += 0.1;
    }
    
    return bonus;
  }

  private generateMatchReasons(userData: QuestionnaireData, companion: Companion, hobbyScore: number, personalityScore: number): string[] {
    const reasons: string[] = [];
    
    // Hobby matches
    if (hobbyScore > 0.3) {
      const sharedHobbies = userData.hobbies.filter(hobby => 
        companion.hobbies.some(ch => ch.toLowerCase().includes(hobby.toLowerCase()))
      );
      if (sharedHobbies.length > 0) {
        reasons.push(`Shares your interest in ${sharedHobbies.slice(0, 2).join(' and ')}`);
      }
    }
    
    // Personality matches
    if (personalityScore > 0.2) {
      const sharedTraits = userData.personality.filter(trait => 
        companion.personality.some(ct => ct.toLowerCase().includes(trait.toLowerCase()))
      );
      if (sharedTraits.length > 0) {
        reasons.push(`Both ${sharedTraits.slice(0, 2).join(' and ').toLowerCase()}`);
      }
    }
    
    // Age compatibility
    const [minAge, maxAge] = this.parseAgeRange(userData.ageRange);
    if (companion.age >= minAge && companion.age <= maxAge) {
      reasons.push(`Perfect age match at ${companion.age}`);
    }
    
    // Location diversity
    if (companion.location) {
      reasons.push(`Brings ${companion.location} culture and perspective`);
    }
    
    // Bio-based reasons
    if (companion.bio.toLowerCase().includes('passionate') && userData.relationshipGoals === 'romantic') {
      reasons.push('Passionate and emotionally connected');
    }
    
    if (companion.bio.toLowerCase().includes('creative') && userData.hobbies.some(h => ['art', 'music', 'photography', 'cooking'].includes(h.toLowerCase()))) {
      reasons.push('Shares your creative spirit');
    }
    
    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  public findMatches(userData: QuestionnaireData, companions: Companion[]): CompanionMatch[] {
    const [minAge, maxAge] = this.parseAgeRange(userData.ageRange);
    
    // Filter companions by basic criteria
    const filteredCompanions = companions.filter(companion => {
      // Gender filter
      if (userData.gender !== 'any' && companion.gender.toLowerCase() !== userData.gender.toLowerCase()) {
        return false;
      }
      
      // Age filter (with some flexibility)
      const ageInRange = companion.age >= (minAge - 2) && companion.age <= (maxAge + 2);
      if (!ageInRange) {
        return false;
      }
      
      return true;
    });
    
    // Score and rank companions
    const scoredCompanions: CompanionMatch[] = filteredCompanions.map(companion => {
      const hobbyScore = this.calculateHobbyCompatibility(userData.hobbies, companion.hobbies);
      const personalityScore = this.calculatePersonalityCompatibility(userData.personality, companion.personality);
      const compatibilityBonus = this.getCompatibilityBonus(userData.companionType, userData.relationshipGoals, companion);
      
      // Base compatibility score
      let compatibilityScore = (hobbyScore * 0.4) + (personalityScore * 0.4) + compatibilityBonus;
      
      // Age preference bonus
      const [minAge, maxAge] = this.parseAgeRange(userData.ageRange);
      if (companion.age >= minAge && companion.age <= maxAge) {
        compatibilityScore += 0.1;
      }
      
      // Ensure score is between 0 and 1
      compatibilityScore = Math.min(1, Math.max(0, compatibilityScore));
      
      const matchReasons = this.generateMatchReasons(userData, companion, hobbyScore, personalityScore);
      
      return {
        ...companion,
        compatibilityScore,
        matchReasons
      };
    });
    
    // Sort by compatibility score (highest first) and return top matches
    return scoredCompanions
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 6); // Return top 6 matches
  }

  public getRecommendationSummary(userData: QuestionnaireData, matches: CompanionMatch[]): string {
    if (matches.length === 0) {
      return "We're still learning about your preferences. Browse all companions to find your perfect match!";
    }
    
    const topMatch = matches[0];
    const scorePercent = Math.round(topMatch.compatibilityScore * 100);
    
    return `Based on your preferences for ${userData.companionType} companionship, we found ${matches.length} great matches! Your top match is ${topMatch.name} with ${scorePercent}% compatibility.`;
  }
}