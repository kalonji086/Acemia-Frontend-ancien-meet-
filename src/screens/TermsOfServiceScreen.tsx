import React from 'react';
import LegalDocumentScreen from '../components/LegalDocumentScreen';

export default function TermsOfServiceScreen({ navigation, isComponent = false }: any) {
  return <LegalDocumentScreen type="tos" navigation={navigation} isComponent={isComponent} />;
}
