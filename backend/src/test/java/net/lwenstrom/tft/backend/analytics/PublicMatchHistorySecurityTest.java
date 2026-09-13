package net.lwenstrom.tft.backend.analytics;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
        properties = {
            "spring.datasource.url=jdbc:sqlite:file:public-history-security?mode=memory&cache=shared&foreign_keys=on",
            "analytics.admin.password=tft123"
        })
class PublicMatchHistorySecurityTest {
    @Autowired
    private WebApplicationContext applicationContext;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext).build();
    }

    @Test
    void permitsUnauthenticatedHistoryReads() throws Exception {
        mockMvc.perform(get("/api/match-history")).andExpect(status().isOk());
    }
}
