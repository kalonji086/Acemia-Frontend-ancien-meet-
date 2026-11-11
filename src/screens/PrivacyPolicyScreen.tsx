import React from 'react';
import LegalDocumentScreen from '../components/LegalDocumentScreen';

export default function PrivacyPolicyScreen({ navigation, isComponent = false }: any) {
  return <LegalDocumentScreen type="privacy" navigation={navigation} isComponent={isComponent} />;
}
