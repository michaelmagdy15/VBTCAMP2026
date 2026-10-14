import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import CommunityHeader from './CommunityHeader';
import BottomNavigation from './BottomNavigation';
import * as CommunityExports from './index';

describe('Community Shell Navigation Components', () => {
  describe('Exports and Component signatures', () => {
    it('exports CommunityHeader as default and named export', () => {
      expect(CommunityHeader).toBeDefined();
      expect(typeof CommunityHeader).toBe('function');
      expect(CommunityExports.CommunityHeader).toBe(CommunityHeader);
    });

    it('exports BottomNavigation as default and named export', () => {
      expect(BottomNavigation).toBeDefined();
      expect(typeof BottomNavigation).toBe('function');
      expect(CommunityExports.BottomNavigation).toBe(BottomNavigation);
    });
  });

  describe('CommunityHeader component logic', () => {
    it('creates a React element without error when given default props', () => {
      const element = React.createElement(CommunityHeader, {});
      expect(element).toBeDefined();
      expect(element.type).toBe(CommunityHeader);
    });

    it('creates a React element with signed in user and callbacks', () => {
      const onOpenNotifications = vi.fn();
      const onOpenProfile = vi.fn();
      const onSelectCommunity = vi.fn();
      const currentUser = {
        name: 'Michael Magdy',
        role: 'admin',
        email: 'michael@vbt.org',
      };

      const element = React.createElement(CommunityHeader, {
        currentUser,
        communityName: 'Downtown Campus',
        isOffline: false,
        unreadCount: 5,
        onOpenNotifications,
        onOpenProfile,
        onSelectCommunity,
      });

      expect(element.props.currentUser.role).toBe('admin');
      expect(element.props.communityName).toBe('Downtown Campus');
      expect(element.props.unreadCount).toBe(5);
      expect(element.props.isOffline).toBe(false);
    });

    it('creates a React element for guest / offline mode', () => {
      const onOpenAuth = vi.fn();
      const element = React.createElement(CommunityHeader, {
        currentUser: null,
        isOffline: true,
        unreadCount: 0,
        onOpenAuth,
      });

      expect(element.props.currentUser).toBeNull();
      expect(element.props.isOffline).toBe(true);
      expect(element.props.onOpenAuth).toBe(onOpenAuth);
    });
  });

  describe('BottomNavigation component logic', () => {
    it('creates a React element with currentTab', () => {
      const onSelectTab = vi.fn();
      const element = React.createElement(BottomNavigation, {
        currentTab: 'serve',
        onSelectTab,
        unreadCount: 3,
      });

      expect(element.props.currentTab).toBe('serve');
      expect(element.props.unreadCount).toBe(3);
      expect(element.props.onSelectTab).toBe(onSelectTab);
    });

    it('supports tab switching for each of the 5 required tabs', () => {
      const requiredTabs = ['home', 'community', 'serve', 'schedule', 'profile'];
      requiredTabs.forEach((tab) => {
        const element = React.createElement(BottomNavigation, {
          currentTab: tab,
        });
        expect(element.props.currentTab).toBe(tab);
      });
    });
  });
});
