// Small hand-picked name pools combined at generation time to produce
// thousands of distinct, realistic-looking student names without needing
// an external dataset or API.

export const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Kabir', 'Aryan', 'Dhruv', 'Kartik', 'Rudra', 'Yash', 'Aniket', 'Devansh', 'Harsh', 'Nikhil',
  'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Ira', 'Myra', 'Anika', 'Kiara', 'Sara', 'Riya',
  'Priya', 'Neha', 'Pooja', 'Shreya', 'Divya', 'Meera', 'Tanvi', 'Aisha', 'Kavya', 'Lakshmi',
  'Rahul', 'Amit', 'Vikram', 'Suresh', 'Rajesh', 'Manoj', 'Sandeep', 'Pranav', 'Varun', 'Karan',
  'Sneha', 'Pallavi', 'Swathi', 'Deepika', 'Nandini', 'Harini', 'Sindhu', 'Bhavya', 'Chandana', 'Keerthi',
];

export const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Reddy', 'Rao', 'Iyer', 'Nair', 'Menon', 'Pillai', 'Kumar',
  'Singh', 'Patel', 'Mehta', 'Joshi', 'Desai', 'Kulkarni', 'Naidu', 'Chawla', 'Bhat', 'Shetty',
  'Agarwal', 'Bose', 'Chatterjee', 'Mukherjee', 'Das', 'Pandey', 'Mishra', 'Tiwari', 'Yadav', 'Choudhary',
  'Krishnan', 'Subramaniam', 'Raghavan', 'Venkatesh', 'Prasad', 'Hegde', 'Kamath', 'Rathi', 'Malhotra', 'Kapoor',
];

export function randomName(rng) {
  const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

const COMPANY_PREFIXES = [
  'Nova', 'Vertex', 'Cloud', 'Data', 'Fin', 'Code', 'Quantum', 'Byte', 'Nexus', 'Astra',
  'Terra', 'Zen', 'Pulse', 'Orbit', 'Helix', 'Silver', 'Iron', 'Blue', 'Green', 'Bright',
  'Swift', 'Prime', 'Peak', 'True', 'Core', 'Meta', 'Neo', 'Lumen', 'Vivid', 'Crest',
];

const COMPANY_SUFFIXES = [
  'Tech', 'Systems', 'Forge', 'Sphere', 'Edge', 'Matrix', 'Soft', 'Labs', 'Works', 'Logic',
  'Dynamics', 'Solutions', 'Networks', 'Analytics', 'Robotics', 'Ventures', 'Group', 'Industries', 'Innovations', 'Digital',
];

export function generateCompanyName(rng, usedNames) {
  let name;
  let attempts = 0;
  do {
    const prefix = COMPANY_PREFIXES[Math.floor(rng() * COMPANY_PREFIXES.length)];
    const suffix = COMPANY_SUFFIXES[Math.floor(rng() * COMPANY_SUFFIXES.length)];
    name = `${prefix}${suffix}`;
    attempts += 1;
  } while (usedNames.has(name) && attempts < 50);
  usedNames.add(name);
  return name;
}
