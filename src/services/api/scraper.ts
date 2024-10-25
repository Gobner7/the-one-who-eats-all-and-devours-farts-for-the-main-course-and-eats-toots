import axios from 'axios';
import * as cheerio from 'cheerio';
import { CardListing, CardData } from '../../types/market';
import { proxyRotator } from '../proxy';
import { rateLimiter } from '../rate-limiter';

// Rest of the file remains the same...