'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import BrainHeader from '@/components/BrainHeader';
import ChatBubble from '@/components/ChatBubble';
import ChatInput from '@/components/ChatInput';
import OpportunityBanner, { type OpportunityItem } from '@/components/OpportunityBanner';
import RoomList from '@/components/RoomList';
import RoomBar from '@/components/RoomBar';
import WordModal from '@/components/WordModal';
import WordPreviewSheet from '@/components/WordPreviewSheet';
import CorePhrase from '@/components/CorePhrase';
import ShareRoomModal from '@/components/ShareRoomModal';
import { speakNow } from '@/lib/tts';
import styles from './page.module.css';
import { resolveLearningMeaning } from '@/lib/language/resolveLearningMeaning';
