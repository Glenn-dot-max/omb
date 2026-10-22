<script setup>
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import OngletFranchises from '@/components/admin/OngletFranchises.vue'
import OngletUtilisateurs from '@/components/admin/OngletUtilisateurs.vue'
</script>

<template>
  <main class="container">
    <h2>⚙️ Administration</h2>
    <Tabs value="franchises">
      <TabList>
        <Tab value="franchises">🏢 Franchises</Tab>
        <Tab value="utilisateurs">👥 Utilisateurs</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="franchises">
          <OngletFranchises />
        </TabPanel>
        <TabPanel value="utilisateurs">
          <OngletUtilisateurs />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </main>
</template>
